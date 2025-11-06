from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
import razorpay
import hmac
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from models import (
    UserCreate, UserLogin, User, UserInDB, UserRole, Token, TokenData,
    ProductCreate, ProductUpdate, Product,
    OrderCreate, OrderUpdate, Order, OrderStatus,
    Wallet, Transaction, TransactionCreate, TransactionType, TransactionStatus,
    PaymentOrderCreate, PaymentVerification, MessageResponse, WalletResponse,
    Discount, DiscountCreate, DiscountUpdate, DiscountType,
    Category, CategoryCreate, CategoryUpdate
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'divine_cakery')]

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "divine_cakery_secret_key_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Razorpay Client
razorpay_client = razorpay.Client(auth=(
    os.environ.get("RAZORPAY_KEY_ID", ""),
    os.environ.get("RAZORPAY_KEY_SECRET", "")
))

# Create the main app
app = FastAPI(title="Divine Cakery API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Email Helper Function
def send_email_notification(subject: str, body: str, to_email: str):
    """Send email notification using SMTP"""
    try:
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", 587))
        smtp_username = os.environ.get("SMTP_USERNAME", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add body to email
        msg.attach(MIMEText(body, 'html'))
        
        # Create SMTP session
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()  # Enable TLS encryption
        server.login(smtp_username, smtp_password)
        
        # Send email
        text = msg.as_string()
        server.sendmail(smtp_username, to_email, text)
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False


# Helper Functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception
    
    user_dict = await db.users.find_one({"username": token_data.username})
    if user_dict is None:
        raise credentials_exception
    user = User(**user_dict)
    return user

async def get_current_user_optional(token: str = Depends(oauth2_scheme)) -> User | None:
    """
    Optional authentication - returns User if authenticated, None if not
    Used for endpoints that should behave differently for authenticated vs unauthenticated users
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        
        user_dict = await db.users.find_one({"username": username})
        if user_dict is None:
            return None
        return User(**user_dict)
    except:
        return None


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
        )
    return current_user


# Authentication Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_dict = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "phone": user_data.phone,
        "role": UserRole.CUSTOMER,
        "business_name": user_data.business_name,
        "address": user_data.address,
        "wallet_balance": 0.0,
        "can_topup_wallet": user_data.can_topup_wallet,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True,
        "is_approved": False,  # New customers need admin approval
        "favorite_products": []
    }
    
    await db.users.insert_one(user_dict)
    
    # Create wallet for user
    wallet_dict = {
        "user_id": user_id,
        "balance": 0.0,
        "updated_at": datetime.utcnow()
    }
    await db.wallets.insert_one(wallet_dict)
    
    # Send email notification to admin automatically
    admin_email = os.environ.get("ADMIN_EMAIL", "contact@divinecakery.in")
    subject = "🔔 New User Registration - Divine Cakery"
    
    # Create HTML email body
    email_body = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #8B4513; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
            .content {{ background-color: #FFF8DC; padding: 20px; border-radius: 0 0 5px 5px; }}
            .info-row {{ margin: 10px 0; padding: 10px; background-color: white; border-radius: 5px; }}
            .label {{ font-weight: bold; color: #8B4513; }}
            .footer {{ margin-top: 20px; text-align: center; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🔔 New User Registration Alert</h2>
            </div>
            <div class="content">
                <p>A new user has registered and is waiting for approval:</p>
                
                <div class="info-row">
                    <span class="label">Username:</span> {user_data.username}
                </div>
                
                <div class="info-row">
                    <span class="label">Business Name:</span> {user_data.business_name or 'N/A'}
                </div>
                
                <div class="info-row">
                    <span class="label">Phone:</span> {user_data.phone or 'N/A'}
                </div>
                
                <div class="info-row">
                    <span class="label">Email:</span> {user_data.email or 'N/A'}
                </div>
                
                <div class="info-row">
                    <span class="label">Address:</span> {user_data.address or 'N/A'}
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background-color: #FFE4B5; border-left: 4px solid #8B4513; border-radius: 5px;">
                    <p style="margin: 0;"><strong>Action Required:</strong> Please login to the admin panel to approve this registration request.</p>
                </div>
            </div>
            <div class="footer">
                <p>Divine Cakery - Wholesale Bakery Management System</p>
                <p>Registration Date: {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send email notification (non-blocking)
    try:
        send_email_notification(subject, email_body, admin_email)
        logger.info(f"Registration email sent for user: {user_data.username}")
    except Exception as e:
        logger.error(f"Failed to send registration email: {str(e)}")
        # Continue even if email fails - don't block registration
    
    return User(**user_dict)


@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    logger.info(f"Login attempt for username: {user_data.username}")
    user_dict = await db.users.find_one({"username": user_data.username})
    
    if not user_dict:
        logger.warning(f"User not found: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"User found: {user_data.username}, role: {user_dict.get('role')}, approved: {user_dict.get('is_approved')}")
    
    if not verify_password(user_data.password, user_dict["hashed_password"]):
        logger.warning(f"Password verification failed for user: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"Password verified for user: {user_data.username}")
    
    # Check if customer account is approved (admins don't need approval)
    if user_dict.get("role") == UserRole.CUSTOMER and not user_dict.get("is_approved", True):
        logger.warning(f"Customer account not approved: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration pending approval from admin. You will be notified within 1 day.",
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_dict["username"], "role": user_dict["role"]},
        expires_delta=access_token_expires
    )
    logger.info(f"Login successful for user: {user_data.username}")
    return {"access_token": access_token, "token_type": "bearer"}


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# Category Routes
@api_router.get("/categories", response_model=List[Category])
async def get_all_categories(current_user: User = Depends(get_current_user_optional)):
    """
    Get all categories. 
    - For customers: Returns only non-admin categories
    - For admins: Returns all categories including admin-only ones
    """
    if current_user and current_user.role == UserRole.ADMIN:
        # Admin users see all categories
        categories = await db.categories.find().sort("display_order", 1).to_list(1000)
    else:
        # Customer users only see non-admin categories
        categories = await db.categories.find({"is_admin_only": {"$ne": True}}).sort("display_order", 1).to_list(1000)
    
    return [Category(**cat) for cat in categories]

@api_router.post("/admin/categories", response_model=Category)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_admin)
):
    # Check if category already exists
    existing = await db.categories.find_one({"name": category.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    category_dict = category.model_dump()
    category_dict["id"] = str(uuid.uuid4())
    category_dict["created_at"] = datetime.utcnow()
    
    await db.categories.insert_one(category_dict)
    return Category(**category_dict)

@api_router.put("/admin/categories/{category_id}", response_model=Category)
async def update_category(
    category_id: str,
    category: CategoryUpdate,
    current_user: User = Depends(get_current_admin)
):
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {k: v for k, v in category.model_dump().items() if v is not None}
    
    if update_data:
        await db.categories.update_one(
            {"id": category_id},
            {"$set": update_data}
        )
    
    updated = await db.categories.find_one({"id": category_id})
    return Category(**updated)

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_admin)
):
    # Check if category is used by any products
    products_using = await db.products.find_one({"category": category_id})
    if products_using:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category that is being used by products"
        )
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}

# Product Routes
@api_router.post("/products", response_model=Product)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_admin)
):
    product_id = str(uuid.uuid4())
    product_dict = {
        "id": product_id,
        **product_data.dict(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Ensure categories is populated - if empty, use category field
    if not product_dict.get("categories"):
        product_dict["categories"] = [product_dict["category"]] if product_dict.get("category") else []
    
    await db.products.insert_one(product_dict)
    return Product(**product_dict)


@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    is_available: Optional[bool] = None
):
    query = {}
    if category:
        # Check both old 'category' field and new 'categories' array
        query["$or"] = [
            {"category": category},
            {"categories": category}
        ]
    if is_available is not None:
        query["is_available"] = is_available
    
    products = await db.products.find(query).to_list(1000)
    return [Product(**product) for product in products]


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)


@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_admin)
):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated_product = await db.products.find_one({"id": product_id})
    return Product(**updated_product)


@api_router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_admin)
):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}


# Favorites Routes
@api_router.post("/favorites/add/{product_id}")
async def add_to_favorites(
    product_id: str,
    current_user: User = Depends(get_current_user)
):
    # Check if product exists
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get user's current favorites
    user = await db.users.find_one({"id": current_user.id})
    favorite_products = user.get("favorite_products", [])
    
    # Add product if not already in favorites
    if product_id not in favorite_products:
        favorite_products.append(product_id)
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"favorite_products": favorite_products}}
        )
    
    return {"message": "Product added to favorites", "favorite_products": favorite_products}


@api_router.delete("/favorites/remove/{product_id}")
async def remove_from_favorites(
    product_id: str,
    current_user: User = Depends(get_current_user)
):
    # Get user's current favorites
    user = await db.users.find_one({"id": current_user.id})
    favorite_products = user.get("favorite_products", [])
    
    # Remove product if in favorites
    if product_id in favorite_products:
        favorite_products.remove(product_id)
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"favorite_products": favorite_products}}
        )
    
    return {"message": "Product removed from favorites", "favorite_products": favorite_products}


@api_router.get("/favorites", response_model=List[Product])
async def get_favorites(current_user: User = Depends(get_current_user)):
    # Get user's favorites
    user = await db.users.find_one({"id": current_user.id})
    favorite_product_ids = user.get("favorite_products", [])
    
    if not favorite_product_ids:
        return []
    
    # Get products from favorites list
    products = await db.products.find({"id": {"$in": favorite_product_ids}}).to_list(1000)
    return [Product(**product) for product in products]


# Wallet Routes
@api_router.get("/wallet", response_model=WalletResponse)
async def get_wallet(current_user: User = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": current_user.id})
    if not wallet:
        # Create wallet if it doesn't exist
        wallet = {
            "user_id": current_user.id,
            "balance": 0.0,
            "updated_at": datetime.utcnow()
        }
        await db.wallets.insert_one(wallet)
    
    return WalletResponse(balance=wallet["balance"], updated_at=wallet["updated_at"])


# Payment Routes
@api_router.post("/payments/create-order")
async def create_payment_order(
    payment_data: PaymentOrderCreate,
    current_user: User = Depends(get_current_user)
):
    try:
        # Create transaction record first
        transaction_id = str(uuid.uuid4())
        
        # Create Payment Link in Razorpay
        short_user_id = str(current_user.id)[:8]
        timestamp = int(datetime.utcnow().timestamp())
        reference_id = f"txn_{short_user_id}_{timestamp}"[:40]
        
        payment_link_data = {
            "amount": int(payment_data.amount * 100),  # Convert to paise
            "currency": "INR",
            "description": f"{payment_data.transaction_type.title()} - Divine Cakery",
            "customer": {
                "name": current_user.business_name or current_user.username,
                "contact": current_user.phone or "",
                "email": current_user.email or ""
            },
            "notify": {
                "sms": False,
                "email": False
            },
            "reminder_enable": False,
            "reference_id": reference_id,
            "notes": {
                "user_id": current_user.id,
                "transaction_id": transaction_id,
                "transaction_type": payment_data.transaction_type,
                **(payment_data.notes or {})
            },
            "callback_url": f"{os.environ.get('BACKEND_URL', 'http://localhost:8001')}/api/payments/callback",
            "callback_method": "get"
        }
        
        payment_link = razorpay_client.payment_link.create(payment_link_data)
        
        # Create transaction record
        transaction_dict = {
            "id": transaction_id,
            "user_id": current_user.id,
            "amount": payment_data.amount,
            "transaction_type": payment_data.transaction_type,
            "payment_method": "upi",
            "razorpay_order_id": payment_link.get("id"),
            "razorpay_payment_link_id": payment_link.get("id"),
            "status": TransactionStatus.PENDING,
            "notes": payment_data.notes,
            "created_at": datetime.utcnow()
        }
        
        await db.transactions.insert_one(transaction_dict)
        
        return {
            "payment_link_url": payment_link.get("short_url"),
            "payment_link_id": payment_link.get("id"),
            "amount": payment_link.get("amount"),
            "currency": payment_link.get("currency"),
            "transaction_id": transaction_id
        }
    
    except Exception as e:
        logger.error(f"Error creating payment link: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/payments/verify")
async def verify_payment(
    verification_data: PaymentVerification,
    current_user: User = Depends(get_current_user)
):
    try:
        # Verify signature
        signature_payload = f"{verification_data.razorpay_order_id}|{verification_data.razorpay_payment_id}"
        expected_signature = hmac.new(
            key=os.environ.get("RAZORPAY_KEY_SECRET", "").encode(),
            msg=signature_payload.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, verification_data.razorpay_signature):
            return {"verified": False, "message": "Invalid signature"}
        
        # Update transaction
        transaction = await db.transactions.find_one({
            "razorpay_order_id": verification_data.razorpay_order_id
        })
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        await db.transactions.update_one(
            {"id": transaction["id"]},
            {
                "$set": {
                    "razorpay_payment_id": verification_data.razorpay_payment_id,
                    "status": TransactionStatus.SUCCESS
                }
            }
        )
        
        # Update wallet if wallet topup
        if transaction["transaction_type"] == TransactionType.WALLET_TOPUP:
            await db.wallets.update_one(
                {"user_id": current_user.id},
                {
                    "$inc": {"balance": transaction["amount"]},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            # Update user's wallet balance
            await db.users.update_one(
                {"id": current_user.id},
                {"$inc": {"wallet_balance": transaction["amount"]}}
            )
        
        return {
            "verified": True,
            "message": "Payment verified successfully",
            "transaction_id": transaction["id"]
        }
    
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper function to generate order number in format YYMMDDXXXX
async def generate_order_number() -> str:
    """
    Generates order number in format: YYMMDDXXXX using atomic counter
    YY = Current year (2 digits)
    MM = Current month (2 digits)
    DD = Current date (2 digits)
    XXXX = Sequential counter (4 digits) - atomic increment
    """
    now = datetime.utcnow()
    year = now.strftime("%y")  # 2-digit year
    month = now.strftime("%m")  # 2-digit month
    day = now.strftime("%d")  # 2-digit day
    
    date_prefix = f"{year}{month}{day}"
    
    # Use MongoDB's findOneAndUpdate with atomic increment for thread-safe counter
    counter_doc = await db.counters.find_one_and_update(
        {"_id": f"order_{date_prefix}"},
        {"$inc": {"sequence": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER  # Return the updated document
    )
    
    # Get the sequence number
    sequence = counter_doc.get("sequence", 1)
    
    # Format: YYMMDDXXXX
    order_number = f"{date_prefix}{sequence:04d}"
    return order_number


# Order Routes
@api_router.post("/orders", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    # Check if payment method is wallet
    if order_data.payment_method == "wallet":
        wallet = await db.wallets.find_one({"user_id": current_user.id})
        if not wallet or wallet["balance"] < order_data.total_amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        
        # Deduct from wallet
        await db.wallets.update_one(
            {"user_id": current_user.id},
            {
                "$inc": {"balance": -order_data.total_amount},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"wallet_balance": -order_data.total_amount}}
        )
        
        payment_status = "completed"
    else:
        payment_status = "pending"
    
    # Calculate delivery date (1 day after order for orders placed after 4 AM, same day if before 4 AM)
    now = datetime.utcnow()
    current_hour = now.hour
    delivery_date = now
    if current_hour >= 4:
        delivery_date = now + timedelta(days=1)
    
    # Create order with new format order number
    order_id = await generate_order_number()
    order_dict = {
        "id": order_id,
        "user_id": current_user.id,
        "items": [item.dict() for item in order_data.items],
        "subtotal": order_data.subtotal,
        "delivery_charge": order_data.delivery_charge,
        "discount_amount": order_data.discount_amount,
        "total_amount": order_data.total_amount,
        "payment_method": order_data.payment_method,
        "payment_status": payment_status,
        "order_status": OrderStatus.PENDING,
        "order_type": order_data.order_type,
        "delivery_address": order_data.delivery_address or current_user.address,
        "delivery_date": delivery_date,
        "notes": order_data.notes,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.orders.insert_one(order_dict)
    
    # Create transaction record for wallet payment
    if order_data.payment_method == "wallet":
        transaction_dict = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "amount": order_data.total_amount,
            "transaction_type": TransactionType.ORDER_PAYMENT,
            "payment_method": "wallet",
            "status": TransactionStatus.SUCCESS,
            "notes": {"order_id": order_id},
            "created_at": datetime.utcnow()
        }
        await db.transactions.insert_one(transaction_dict)
    
    return Order(**order_dict)


@api_router.get("/orders")
async def get_orders(
    delivery_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {"user_id": current_user.id} if current_user.role != UserRole.ADMIN else {}
    
    # Add delivery date filter if provided
    # Note: Since we don't store delivery_date separately, we filter by created_at
    # assuming delivery is 1 day after order creation
    if delivery_date:
        try:
            # Parse the date string and create start and end of day
            filter_date = datetime.fromisoformat(delivery_date.replace('Z', '+00:00'))
            # Orders created the day before the delivery date
            order_date = filter_date - timedelta(days=1)
            start_of_day = order_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = order_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            query["created_at"] = {"$gte": start_of_day, "$lte": end_of_day}
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(1000)
    
    # Enrich orders with user information for admin view
    enriched_orders = []
    for order in orders:
        # Remove MongoDB _id field to avoid serialization issues
        order.pop('_id', None)
        order_dict = dict(order)
        # Fetch user information
        user = await db.users.find_one({"id": order_dict["user_id"]})
        if user:
            order_dict["user_name"] = user.get("username", "N/A")
            order_dict["user_phone"] = user.get("phone", None)
        enriched_orders.append(order_dict)
    
    return enriched_orders


@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user.role != UserRole.ADMIN and order["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return Order(**order)


@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order(
    order_id: str,
    order_update: OrderUpdate,
    current_user: User = Depends(get_current_admin)
):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {k: v for k, v in order_update.dict().items() if v is not None}
    # Map 'status' field to 'order_status' for database
    if 'status' in update_data:
        update_data['order_status'] = update_data.pop('status')
    update_data["updated_at"] = datetime.utcnow()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated_order = await db.orders.find_one({"id": order_id})
    return Order(**updated_order)


# Transaction Routes
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(1000)
    return [Transaction(**txn) for txn in transactions]


# Admin Routes
@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(current_user: User = Depends(get_current_admin)):
    users = await db.users.find().to_list(1000)
    
    # Enrich users with wallet balance
    enriched_users = []
    for user in users:
        # Fetch wallet balance for each user
        wallet = await db.wallets.find_one({"user_id": user["id"]})
        user["wallet_balance"] = wallet.get("balance", 0.0) if wallet else 0.0
        enriched_users.append(User(**user))
    
    return enriched_users


@api_router.post("/admin/users", response_model=User)
async def create_user_by_admin(
    user_data: UserCreate,
    current_user: User = Depends(get_current_admin)
):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_dict = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "phone": user_data.phone,
        "role": UserRole.CUSTOMER,
        "business_name": user_data.business_name,
        "address": user_data.address,
        "wallet_balance": 0.0,
        "can_topup_wallet": user_data.can_topup_wallet,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True,
        "is_approved": True,  # Admin-created users are pre-approved
        "favorite_products": []
    }
    
    await db.users.insert_one(user_dict)
    
    # Create wallet for user
    wallet_dict = {
        "user_id": user_id,
        "balance": 0.0,
        "updated_at": datetime.utcnow()
    }
    await db.wallets.insert_one(wallet_dict)
    
    return User(**user_dict)


@api_router.get("/admin/pending-users", response_model=List[User])
async def get_pending_users(current_user: User = Depends(get_current_admin)):
    """Get all users pending approval"""
    users = await db.users.find({"is_approved": False}).to_list(1000)
    return [User(**user) for user in users]


@api_router.put("/admin/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    current_user: User = Depends(get_current_admin)
):
    """Approve a pending user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_approved": True}}
    )
    
    return {"message": "User approved successfully", "user_id": user_id, "phone": user.get("phone")}


@api_router.put("/admin/users/{user_id}/reject")
async def reject_user(
    user_id: str,
    current_user: User = Depends(get_current_admin)
):
    """Reject a pending user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Optionally delete the user or mark as rejected
    await db.users.delete_one({"id": user_id})
    await db.wallets.delete_one({"user_id": user_id})
    
    return {"message": "User rejected successfully", "user_id": user_id, "phone": user.get("phone")}


@api_router.put("/admin/users/{user_id}", response_model=User)
async def update_user_by_admin(
    user_id: str,
    user_data: dict,
    current_user: User = Depends(get_current_admin)
):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent changing role to admin (security)
    if "role" in user_data:
        user_data.pop("role")
    
    # If password is being changed, hash it
    if "password" in user_data and user_data["password"]:
        user_data["hashed_password"] = get_password_hash(user_data["password"])
        user_data.pop("password")
    
    # Update user
    await db.users.update_one({"id": user_id}, {"$set": user_data})
    
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)


@api_router.post("/admin/users/{user_id}/add-wallet-balance")
async def add_wallet_balance_by_admin(
    user_id: str,
    amount: float,
    current_user: User = Depends(get_current_admin)
):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create wallet
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "balance": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.wallets.insert_one(wallet)
    
    # Update wallet balance
    new_balance = wallet.get("balance", 0.0) + amount
    await db.wallets.update_one(
        {"user_id": user_id},
        {
            "$set": {"balance": new_balance, "updated_at": datetime.utcnow()}
        }
    )
    
    # Create transaction record
    transaction_id = str(uuid.uuid4())
    transaction_dict = {
        "id": transaction_id,
        "user_id": user_id,
        "amount": amount,
        "transaction_type": TransactionType.WALLET_TOPUP,
        "payment_method": "admin_credit",
        "status": TransactionStatus.SUCCESS,
        "notes": {"added_by_admin": current_user.username, "admin_id": current_user.id},
        "created_at": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction_dict)
    
    return {
        "message": "Wallet balance added successfully",
        "user_id": user_id,
        "amount_added": amount,
        "new_balance": new_balance,
        "transaction_id": transaction_id
    }


@api_router.delete("/admin/users/{user_id}")
async def delete_user_by_admin(
    user_id: str,
    current_user: User = Depends(get_current_admin)
):
    # Prevent admin from deleting themselves
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting other admins
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin accounts")
    
    # Delete user's wallet
    await db.wallets.delete_one({"user_id": user_id})
    
    # Delete user's orders (optional - or mark as deleted)
    # await db.orders.delete_many({"user_id": user_id})
    
    # Delete user
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


@api_router.post("/admin/users/bulk-delete")
async def bulk_delete_users_by_admin(
    user_ids: List[str],
    current_user: User = Depends(get_current_admin)
):
    """Bulk delete multiple users at once"""
    deleted_count = 0
    skipped_count = 0
    errors = []
    
    for user_id in user_ids:
        try:
            # Prevent admin from deleting themselves
            if user_id == current_user.id:
                errors.append(f"Skipped: Cannot delete your own account")
                skipped_count += 1
                continue
            
            user = await db.users.find_one({"id": user_id})
            if not user:
                errors.append(f"User {user_id} not found")
                skipped_count += 1
                continue
            
            # Prevent deleting other admins
            if user.get("role") == "admin":
                errors.append(f"Skipped: Cannot delete admin account ({user.get('username')})")
                skipped_count += 1
                continue
            
            # Delete user's wallet
            await db.wallets.delete_one({"user_id": user_id})
            
            # Delete user
            await db.users.delete_one({"id": user_id})
            deleted_count += 1
            
        except Exception as e:
            errors.append(f"Error deleting user {user_id}: {str(e)}")
            skipped_count += 1
    
    return {
        "message": f"Deleted {deleted_count} user(s), skipped {skipped_count}",
        "deleted_count": deleted_count,
        "skipped_count": skipped_count,
        "errors": errors
    }


@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_admin)):
    total_users = await db.users.count_documents({"role": UserRole.CUSTOMER})
    total_products = await db.products.count_documents({})
    # Exclude cancelled orders from total count
    total_orders = await db.orders.count_documents({"order_status": {"$ne": OrderStatus.CANCELLED}})
    pending_orders = await db.orders.count_documents({"order_status": OrderStatus.PENDING})
    
    # Calculate total revenue from completed orders (excludes cancelled)
    completed_orders = await db.orders.find({"payment_status": "completed"}).to_list(10000)
    total_revenue = sum(order["total_amount"] for order in completed_orders)
    
    # Calculate revenue based on delivery date (orders created 1 day before)
    from datetime import datetime as dt, timedelta
    today = dt.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Today's revenue (orders delivered today = created yesterday)
    yesterday_start = today - timedelta(days=1)
    yesterday_end = today
    today_orders = await db.orders.find({
        "payment_status": "completed",
        "created_at": {"$gte": yesterday_start, "$lt": yesterday_end}
    }).to_list(10000)
    today_revenue = sum(order["total_amount"] for order in today_orders)
    
    # This week's revenue (deliveries this week = orders created last week + this week)
    week_start = today - timedelta(days=today.weekday())
    # Orders created from (week_start - 1 day) onwards
    week_order_start = week_start - timedelta(days=1)
    week_orders = await db.orders.find({
        "payment_status": "completed",
        "created_at": {"$gte": week_order_start, "$lt": today}
    }).to_list(10000)
    week_revenue = sum(order["total_amount"] for order in week_orders)
    
    # This month's revenue (deliveries this month = orders created from last day of prev month)
    month_start = today.replace(day=1)
    month_order_start = month_start - timedelta(days=1)
    month_orders = await db.orders.find({
        "payment_status": "completed",
        "created_at": {"$gte": month_order_start, "$lt": today}
    }).to_list(10000)
    month_revenue = sum(order["total_amount"] for order in month_orders)
    
    return {
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_revenue": total_revenue,
        "today_revenue": today_revenue,
        "week_revenue": week_revenue,
        "month_revenue": month_revenue,
    }


@api_router.get("/admin/revenue/daily")
async def get_daily_revenue(current_user: User = Depends(get_current_admin)):
    """Get daily revenue breakdown for the last 7 days based on delivery date"""
    from datetime import datetime as dt, timedelta
    
    today = dt.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_revenue = []
    
    for i in range(6, -1, -1):  # Last 7 days (6 days ago to today)
        delivery_date = today - timedelta(days=i)
        
        # Orders created 1 day before delivery date (since delivery is next day)
        order_date = delivery_date - timedelta(days=1)
        order_start = order_date.replace(hour=0, minute=0, second=0, microsecond=0)
        order_end = order_start + timedelta(days=1)
        
        # Get orders created on order_date (will be delivered on delivery_date)
        day_orders = await db.orders.find({
            "payment_status": "completed",
            "created_at": {"$gte": order_start, "$lt": order_end}
        }).to_list(10000)
        
        revenue = sum(order["total_amount"] for order in day_orders)
        
        daily_revenue.append({
            "date": delivery_date.strftime("%Y-%m-%d"),
            "day_name": delivery_date.strftime("%A"),
            "revenue": revenue,
            "order_count": len(day_orders)
        })
    
    return {"daily_revenue": daily_revenue}


@api_router.get("/admin/delivery-notes")
async def get_delivery_notes(current_user: User = Depends(get_current_admin)):
    """Get delivery notes settings"""
    settings = await db.settings.find_one({"type": "delivery_notes"})
    if not settings:
        # Return default settings
        return {
            "enabled": False,
            "message": "Thank you for your order! Please ensure someone is available to receive the delivery."
        }
    return {
        "enabled": settings.get("enabled", False),
        "message": settings.get("message", "")
    }


@api_router.post("/admin/delivery-notes")
async def update_delivery_notes(
    request: dict,
    current_user: User = Depends(get_current_admin)
):
    """Update delivery notes settings"""
    enabled = request.get("enabled", False)
    message = request.get("message", "")
    
    settings = await db.settings.find_one({"type": "delivery_notes"})
    
    settings_data = {
        "type": "delivery_notes",
        "enabled": enabled,
        "message": message,
        "updated_at": datetime.utcnow()
    }
    
    if settings:
        await db.settings.update_one(
            {"type": "delivery_notes"},
            {"$set": settings_data}
        )
    else:
        settings_data["created_at"] = datetime.utcnow()
        await db.settings.insert_one(settings_data)
    
    return {"success": True, "message": "Delivery notes updated successfully"}


@api_router.get("/delivery-notes")
async def get_customer_delivery_notes():
    """Get delivery notes for customers (public endpoint)"""
    settings = await db.settings.find_one({"type": "delivery_notes"})
    if not settings or not settings.get("enabled", False):
        return {"enabled": False, "message": ""}
    return {
        "enabled": True,
        "message": settings.get("message", "")
    }


@api_router.get("/admin/reports/daily-items")
async def get_daily_items_report(
    date: str = None,
    current_user: User = Depends(get_current_admin)
):
    """Get daily report of items ordered by delivery date"""
    from datetime import datetime as dt, timedelta
    
    # Parse date or use today
    if date:
        try:
            delivery_date = dt.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        delivery_date = dt.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Orders created 1 day before delivery date (since delivery is next day)
    order_date = delivery_date - timedelta(days=1)
    order_start = order_date.replace(hour=0, minute=0, second=0, microsecond=0)
    order_end = order_start + timedelta(days=1)
    
    # Get all orders created on order_date (will be delivered on delivery_date), excluding cancelled
    orders = await db.orders.find({
        "created_at": {"$gte": order_start, "$lt": order_end},
        "order_status": {"$ne": OrderStatus.CANCELLED}
    }).to_list(10000)
    
    # Aggregate items
    item_summary = {}
    total_orders = len(orders)
    total_revenue = 0
    
    for order in orders:
        total_revenue += order.get("total_amount", 0)
        for item in order.get("items", []):
            product_id = item.get("product_id")
            product_name = item.get("product_name", "Unknown")
            quantity = item.get("quantity", 0)
            price = item.get("price", 0)
            subtotal = item.get("subtotal", 0)
            
            if product_id in item_summary:
                item_summary[product_id]["quantity"] += quantity
                item_summary[product_id]["revenue"] += subtotal
                item_summary[product_id]["order_count"] += 1
            else:
                item_summary[product_id] = {
                    "product_id": product_id,
                    "product_name": product_name,
                    "quantity": quantity,
                    "price": price,
                    "revenue": subtotal,
                    "order_count": 1
                }
    
    # Convert to list and sort by quantity
    items_list = sorted(
        item_summary.values(),
        key=lambda x: x["quantity"],
        reverse=True
    )
    
    return {
        "date": delivery_date.strftime("%Y-%m-%d"),
        "day_name": delivery_date.strftime("%A"),
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "items": items_list
    }


@api_router.get("/admin/reports/preparation-list")
async def get_preparation_list_report(current_user: User = Depends(get_current_admin)):
    """Get preparation list report: Closing Stock - Confirmed Orders only"""
    
    # Get all products
    products_cursor = db.products.find({})
    products = await products_cursor.to_list(10000)
    
    # Get only CONFIRMED orders
    orders_cursor = db.orders.find({
        "order_status": OrderStatus.CONFIRMED
    })
    orders = await orders_cursor.to_list(10000)
    
    # Calculate total ordered quantity for each product from confirmed orders
    ordered_quantities = {}
    for order in orders:
        for item in order.get("items", []):
            product_id = item.get("product_id")
            quantity = item.get("quantity", 0)
            
            if product_id in ordered_quantities:
                ordered_quantities[product_id] += quantity
            else:
                ordered_quantities[product_id] = quantity
    
    # Calculate preparation list (only negative/deficit items)
    preparation_list = []
    for product in products:
        product_id = product.get("id")
        product_name = product.get("name")
        closing_stock = product.get("closing_stock", 0)
        ordered_qty = ordered_quantities.get(product_id, 0)
        
        # Calculate: Closing Stock - Confirmed Orders
        balance = closing_stock - ordered_qty
        
        # Only show items with negative balance (need to prepare more)
        if balance < 0:
            units_to_prepare = abs(balance)  # Show as positive number
            preparation_list.append({
                "product_id": product_id,
                "product_name": product_name,
                "closing_stock": closing_stock,
                "ordered_quantity": ordered_qty,
                "units_to_prepare": units_to_prepare,
                "unit": product.get("unit", "piece")
            })
    
    # Sort by units_to_prepare (descending)
    preparation_list.sort(key=lambda x: x["units_to_prepare"], reverse=True)
    
    return {
        "total_items": len(preparation_list),
        "items": preparation_list
    }


# Delivery Charge Settings Endpoints
@api_router.get("/settings/delivery-charge")
async def get_delivery_charge_public():
    """Get current delivery charge (public endpoint for customers)"""
    settings = await db.settings.find_one({"key": "delivery_charge"})
    if not settings:
        return {"delivery_charge": 0.0}
    return {"delivery_charge": settings.get("value", 0.0)}


@api_router.get("/admin/settings/delivery-charge")
async def get_delivery_charge(current_user: User = Depends(get_current_admin)):
    """Get current delivery charge (admin endpoint)"""
    settings = await db.settings.find_one({"key": "delivery_charge"})
    if not settings:
        # Create default setting
        await db.settings.insert_one({"key": "delivery_charge", "value": 0.0})
        return {"delivery_charge": 0.0}
    return {"delivery_charge": settings.get("value", 0.0)}


@api_router.put("/admin/settings/delivery-charge")
async def update_delivery_charge(
    delivery_charge: float,
    current_user: User = Depends(get_current_admin)
):
    """Update delivery charge"""
    await db.settings.update_one(
        {"key": "delivery_charge"},
        {"$set": {"value": delivery_charge}},
        upsert=True
    )
    return {"message": "Delivery charge updated", "delivery_charge": delivery_charge}


# Discount Management Endpoints
@api_router.get("/admin/discounts", response_model=List[Discount])
async def get_all_discounts(current_user: User = Depends(get_current_admin)):
    """Get all discounts"""
    from datetime import datetime as dt
    now = dt.utcnow()
    
    discounts = await db.discounts.find().to_list(1000)
    result = []
    for discount in discounts:
        # Calculate is_active based on current date
        start_date = discount.get('start_date')
        end_date = discount.get('end_date')
        
        # Check if discount is within active date range
        is_currently_active = start_date <= now <= end_date if start_date and end_date else False
        
        # Update is_active in database if it has changed
        if discount.get('is_active') != is_currently_active:
            await db.discounts.update_one(
                {"_id": discount["_id"]},
                {"$set": {"is_active": is_currently_active}}
            )
            discount['is_active'] = is_currently_active
        
        result.append(Discount(**discount))
    
    return result


@api_router.get("/admin/discounts/customer/{customer_id}")
async def get_customer_discount(
    customer_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get active discount for a customer"""
    from datetime import datetime as dt
    now = dt.utcnow()
    
    discount = await db.discounts.find_one({
        "customer_id": customer_id,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    })
    
    if not discount:
        return {"has_discount": False}
    
    return {
        "has_discount": True,
        "discount": Discount(**discount)
    }


@api_router.post("/admin/discounts", response_model=Discount)
async def create_discount(
    discount_data: DiscountCreate,
    current_user: User = Depends(get_current_admin)
):
    """Create a new discount"""
    import uuid
    from datetime import datetime as dt
    
    discount_dict = {
        "id": str(uuid.uuid4()),
        **discount_data.dict(),
        "is_active": True,
        "created_at": dt.utcnow(),
        "updated_at": dt.utcnow()
    }
    
    await db.discounts.insert_one(discount_dict)
    return Discount(**discount_dict)


@api_router.put("/admin/discounts/{discount_id}", response_model=Discount)
async def update_discount(
    discount_id: str,
    discount_data: DiscountUpdate,
    current_user: User = Depends(get_current_admin)
):
    """Update a discount"""
    from datetime import datetime as dt
    
    update_data = {k: v for k, v in discount_data.dict().items() if v is not None}
    update_data["updated_at"] = dt.utcnow()
    
    result = await db.discounts.update_one(
        {"id": discount_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Discount not found")
    
    discount = await db.discounts.find_one({"id": discount_id})
    return Discount(**discount)


@api_router.delete("/admin/discounts/{discount_id}")
async def delete_discount(
    discount_id: str,
    current_user: User = Depends(get_current_admin)
):
    """Delete a discount"""
    result = await db.discounts.delete_one({"id": discount_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Discount not found")
    
    return {"message": "Discount deleted successfully"}


# Root routes
@api_router.get("/")
async def root():
    return {"message": "Divine Cakery API", "version": "1.0.0"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


# TEMPORARY: Setup endpoint to create first admin (remove after setup)
@api_router.post("/fix-user-ids")
async def fix_user_ids():
    """
    Migration endpoint to add missing 'id' fields to users.
    This fixes the Internal Server Error on /admin/users endpoint.
    """
    users_without_id = await db.users.find({"id": {"$exists": False}}).to_list(1000)
    
    if not users_without_id:
        return {"message": "All users already have 'id' field", "fixed": 0}
    
    fixed_count = 0
    for user in users_without_id:
        new_id = str(uuid.uuid4())
        result = await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"id": new_id}}
        )
        if result.modified_count > 0:
            fixed_count += 1
    
    return {
        "message": f"Fixed {fixed_count} users by adding 'id' field",
        "fixed": fixed_count
    }


@api_router.post("/setup-admin")
async def setup_admin():
    """
    Temporary endpoint to create/update test users for Play Store reviewers.
    Creates both admin and testcustomer accounts.
    Should be removed after Play Store approval.
    """
    users_collection = db.users
    results = []
    
    # Setup admin user
    existing_admin = await users_collection.find_one({"username": "admin"})
    
    if existing_admin:
        # Update existing admin
        result = await users_collection.update_one(
            {"username": "admin"},
            {"$set": {
                "role": "admin",
                "is_approved": True,
                "is_active": True,
                "admin_access_level": "superadmin",
                "hashed_password": pwd_context.hash("Admin@123")
            }}
        )
        results.append({
            "username": "admin",
            "password": "Admin@123",
            "action": "updated",
            "modified": result.modified_count
        })
    else:
        # Create new admin user
        admin_id = str(uuid.uuid4())
        admin_user = {
            "id": admin_id,
            "username": "admin",
            "email": "admin@divinecakery.in",
            "hashed_password": pwd_context.hash("Admin@123"),
            "phone": "9544183334",
            "role": "admin",
            "business_name": "Divine Cakery",
            "address": "Thiruvananthapuram",
            "wallet_balance": 0.0,
            "is_active": True,
            "is_approved": True,
            "can_topup_wallet": True,
            "onsite_pickup_only": False,
            "delivery_charge_waived": False,
            "admin_access_level": "superadmin",
            "favorite_products": [],
            "created_at": datetime.utcnow()
        }
        result = await users_collection.insert_one(admin_user)
        results.append({
            "username": "admin",
            "password": "Admin@123",
            "action": "created",
            "id": admin_id
        })
    
    # Setup testcustomer user
    existing_customer = await users_collection.find_one({"username": "testcustomer"})
    
    if existing_customer:
        # Update existing customer
        result = await users_collection.update_one(
            {"username": "testcustomer"},
            {"$set": {
                "role": "customer",
                "is_approved": True,
                "is_active": True,
                "hashed_password": pwd_context.hash("Test@123")
            }}
        )
        results.append({
            "username": "testcustomer",
            "password": "Test@123",
            "action": "updated",
            "modified": result.modified_count
        })
    else:
        # Create new testcustomer user
        customer_id = str(uuid.uuid4())
        customer_user = {
            "id": customer_id,
            "username": "testcustomer",
            "email": "testcustomer@divinecakery.in",
            "hashed_password": pwd_context.hash("Test@123"),
            "phone": "9999888877",
            "role": "customer",
            "business_name": "Test Customer Business",
            "address": "Test Address, Test City",
            "wallet_balance": 0.0,
            "is_active": True,
            "is_approved": True,
            "can_topup_wallet": False,
            "onsite_pickup_only": False,
            "delivery_charge_waived": False,
            "favorite_products": [],
            "created_at": datetime.utcnow()
        }
        result = await users_collection.insert_one(customer_user)
        results.append({
            "username": "testcustomer",
            "password": "Test@123",
            "action": "created",
            "id": customer_id
        })
    
    return {
        "message": "Test users setup completed successfully",
        "users": results
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Privacy Policy Endpoint (for Play Store requirement)
@app.get("/privacy-policy")
async def get_privacy_policy():
    """Serve privacy policy for Play Store compliance"""
    from fastapi.responses import HTMLResponse
    
    privacy_html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Divine Cakery - Privacy Policy</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #8B4513; }
            h2 { color: #A0522D; margin-top: 30px; }
            .last-updated { color: #666; font-style: italic; }
        </style>
    </head>
    <body>
        <h1>Privacy Policy for Divine Cakery</h1>
        <p class="last-updated"><strong>Last Updated:</strong> October 24, 2025</p>
        
        <p>Divine Cakery ("we," "our," or "us") operates the Divine Cakery mobile application. This Privacy Policy explains how we collect, use, and protect your information.</p>
        
        <h2>1. Information We Collect</h2>
        <p><strong>Personal Information:</strong> Name, email, phone number, delivery address, payment information (processed via Razorpay)</p>
        <p><strong>Order Information:</strong> Products ordered, order history, delivery preferences</p>
        <p><strong>Usage Information:</strong> Device type, app usage data</p>
        
        <h2>2. How We Use Your Information</h2>
        <ul>
            <li>Process and fulfill orders</li>
            <li>Send order updates via WhatsApp and email</li>
            <li>Process payments securely through Razorpay</li>
            <li>Provide customer support</li>
            <li>Improve our services</li>
        </ul>
        
        <h2>3. Information Sharing</h2>
        <p>We do NOT sell your personal information. We may share information with:</p>
        <ul>
            <li><strong>Razorpay:</strong> For secure payment processing</li>
            <li><strong>WhatsApp:</strong> For order notifications (with consent)</li>
            <li><strong>Delivery Services:</strong> To fulfill orders</li>
        </ul>
        
        <h2>4. Data Security</h2>
        <p>We implement security measures including HTTPS/SSL encryption, secure database storage, and encrypted payment processing.</p>
        
        <h2>5. Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal information. Contact us at: contact@divinecakery.in</p>
        
        <h2>6. Children's Privacy</h2>
        <p>Our app is not intended for children under 13. We do not knowingly collect information from children under 13.</p>
        
        <h2>7. Third-Party Services</h2>
        <p><strong>Razorpay:</strong> <a href="https://razorpay.com/privacy/">Privacy Policy</a></p>
        <p><strong>WhatsApp:</strong> <a href="https://www.whatsapp.com/legal/privacy-policy">Privacy Policy</a></p>
        
        <h2>8. Changes to This Policy</h2>
        <p>We may update this Privacy Policy. Continued use of the app after changes constitutes acceptance.</p>
        
        <h2>9. Contact Us</h2>
        <p><strong>Divine Cakery</strong><br>
        Email: contact@divinecakery.in<br>
        Phone: +91 8075946225</p>
        
        <h2>10. Consent</h2>
        <p>By using our app, you consent to this Privacy Policy.</p>
        
        <hr>
        <p style="text-align: center; color: #666; margin-top: 40px;">© 2025 Divine Cakery. All rights reserved.</p>
    </body>
    </html>
    """
    return HTMLResponse(content=privacy_html)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
