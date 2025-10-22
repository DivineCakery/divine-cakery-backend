from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

from models import (
    UserCreate, UserLogin, User, UserInDB, UserRole, Token, TokenData,
    ProductCreate, ProductUpdate, Product,
    OrderCreate, OrderUpdate, Order, OrderStatus,
    Wallet, Transaction, TransactionCreate, TransactionType, TransactionStatus,
    PaymentOrderCreate, PaymentVerification, MessageResponse, WalletResponse,
    Discount, DiscountCreate, DiscountUpdate, DiscountType
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
        "is_active": True
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


@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user_dict = await db.users.find_one({"username": user_data.username})
    if not user_dict or not verify_password(user_data.password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_dict["username"], "role": user_dict["role"]},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


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
    
    await db.products.insert_one(product_dict)
    return Product(**product_dict)


@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    is_available: Optional[bool] = None
):
    query = {}
    if category:
        query["category"] = category
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
        # Create order in Razorpay
        receipt = f"rcpt_{current_user.id}_{int(datetime.utcnow().timestamp())}"
        order_data = {
            "amount": int(payment_data.amount * 100),  # Convert to paise
            "currency": "INR",
            "receipt": receipt,
            "notes": {
                "user_id": current_user.id,
                "transaction_type": payment_data.transaction_type,
                **(payment_data.notes or {})
            }
        }
        
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Create transaction record
        transaction_id = str(uuid.uuid4())
        transaction_dict = {
            "id": transaction_id,
            "user_id": current_user.id,
            "amount": payment_data.amount,
            "transaction_type": payment_data.transaction_type,
            "payment_method": "upi",
            "razorpay_order_id": razorpay_order["id"],
            "status": TransactionStatus.PENDING,
            "notes": payment_data.notes,
            "created_at": datetime.utcnow()
        }
        
        await db.transactions.insert_one(transaction_dict)
        
        return {
            "order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "razorpay_key_id": os.environ.get("RAZORPAY_KEY_ID", ""),
            "transaction_id": transaction_id
        }
    
    except Exception as e:
        logger.error(f"Error creating payment order: {str(e)}")
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
    Generates order number in format: YYMMDDXXXX
    YY = Current year (2 digits)
    MM = Current month (2 digits)
    DD = Current date (2 digits)
    XXXX = Sequential counter (4 digits)
    """
    now = datetime.utcnow()
    year = now.strftime("%y")  # 2-digit year
    month = now.strftime("%m")  # 2-digit month
    day = now.strftime("%d")  # 2-digit day
    
    # Get or create counter for today
    date_prefix = f"{year}{month}{day}"
    
    # Find the highest order number for today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Get orders created today with new format
    today_orders = await db.orders.find({
        "created_at": {"$gte": today_start, "$lte": today_end},
        "id": {"$regex": f"^{date_prefix}"}
    }).sort("id", -1).limit(1).to_list(1)
    
    if today_orders:
        # Extract the last 4 digits and increment
        last_order_id = today_orders[0]["id"]
        try:
            last_counter = int(last_order_id[-4:])
            new_counter = last_counter + 1
        except:
            new_counter = 1
    else:
        new_counter = 1
    
    # Format: YYMMDDXXXX
    order_number = f"{date_prefix}{new_counter:04d}"
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
    
    # Create order
    order_id = str(uuid.uuid4())
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
    return [User(**user) for user in users]


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
        "is_active": True
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
    enabled: bool,
    message: str,
    current_user: User = Depends(get_current_admin)
):
    """Update delivery notes settings"""
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
    discounts = await db.discounts.find().to_list(1000)
    return [Discount(**discount) for discount in discounts]


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


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
