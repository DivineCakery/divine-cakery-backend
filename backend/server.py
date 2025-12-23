from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.responses import RedirectResponse
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
import re
import json
import base64
import io
import pytz
from PIL import Image

from models import (
    UserCreate, UserLogin, User, UserInDB, UserRole, Token, TokenData,
    ProductCreate, ProductUpdate, Product,
    OrderCreate, OrderUpdate, Order, OrderStatus,
    Wallet, Transaction, TransactionCreate, TransactionType, TransactionStatus,
    PaymentOrderCreate, PaymentVerification, MessageResponse, WalletResponse,
    Discount, DiscountCreate, DiscountUpdate, DiscountType,
    Category, CategoryCreate, CategoryUpdate,
    StandingOrder, StandingOrderCreate, StandingOrderUpdate, StandingOrderStatus,
    RecurrenceType, DurationType, StandingOrderItem,
    PasswordResetRequest, PasswordResetVerifyOTP, PasswordResetComplete,
    AppVersionInfo, AllowedProductsUpdate
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
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days = 7 * 24 * 60 minutes
# Upgraded to Starter plan (2GB RAM) for better performance

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


# Helper function to compress base64 images
def compress_base64_image(base64_string: str, max_width: int = 800, quality: int = 70) -> str:
    """
    Compress a base64 encoded image to reduce size.
    
    Args:
        base64_string: Base64 encoded image string (with or without data URI prefix)
        max_width: Maximum width of the compressed image (maintains aspect ratio)
        quality: JPEG quality (1-100, lower = smaller file size)
    
    Returns:
        Compressed base64 encoded image string
    """
    try:
        # Remove data URI prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',', 1)[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_string)
        
        # Open image with PIL
        img = Image.open(io.BytesIO(image_bytes))
        
        # Convert RGBA to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Resize if image is too large
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        # Save to bytes buffer as JPEG
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=quality, optimize=True)
        buffer.seek(0)
        
        # Encode to base64
        compressed_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        
        # Add data URI prefix back for React Native Image component
        compressed_base64_with_prefix = f"data:image/jpeg;base64,{compressed_base64}"
        
        # Calculate compression ratio
        original_size = len(base64_string)
        compressed_size = len(compressed_base64)
        ratio = (1 - compressed_size / original_size) * 100
        
        logger.info(f"Image compressed: {original_size} -> {compressed_size} bytes ({ratio:.1f}% reduction)")
        
        return compressed_base64_with_prefix
    except Exception as e:
        logger.error(f"Error compressing image: {e}")
        return base64_string  # Return original if compression fails


# Helper function to normalize phone numbers with +91 country code
def normalize_phone_number(phone: str) -> str:
    """
    Normalize phone number to include +91 country code.
    - If already has +91, return as is
    - If starts with 91 (without +), add +
    - If 10 digits, add +91
    - Otherwise return as is
    """
    if not phone:
        return phone
    
    # Remove all non-digit characters except +
    cleaned = re.sub(r'[^\d+]', '', phone)
    
    # If already has +91
    if cleaned.startswith('+91'):
        return cleaned
    
    # If starts with 91 (11 or 12 digits total)
    if cleaned.startswith('91') and len(cleaned) in [12, 13]:
        return '+' + cleaned
    
    # If 10 digits (Indian mobile number)
    if len(cleaned) == 10:
        return '+91' + cleaned
    
    # If starts with 0, remove it and add +91 (old format)
    if cleaned.startswith('0') and len(cleaned) == 11:
        return '+91' + cleaned[1:]
    
    # Return as is if we can't determine the format
    return cleaned if cleaned.startswith('+') else '+' + cleaned


# Helper function to calculate delivery date based on IST time
def calculate_delivery_date() -> datetime:
    """
    Calculate delivery date based on Indian Standard Time (IST).
    
    Rules:
    - Orders placed before 4 AM IST: Delivery same day
    - Orders placed at or after 4 AM IST: Delivery next day
    
    Examples:
    - Order at 11 PM on 2.12.25 → Delivery: 3.12.25 (next day)
    - Order at 3:30 AM on 3.12.25 → Delivery: 3.12.25 (same day)
    - Order at 5 AM on 3.12.25 → Delivery: 4.12.25 (next day)
    
    Returns UTC datetime at midnight for the calculated delivery date
    """
    import pytz
    
    # Get current time in IST
    ist = pytz.timezone('Asia/Kolkata')
    now_ist = datetime.now(ist)
    
    # Get the hour in IST
    current_hour_ist = now_ist.hour
    
    # Calculate delivery date
    if current_hour_ist < 4:
        # Before 4 AM IST - deliver same day
        delivery_date = now_ist.date()
    else:
        # At or after 4 AM IST - deliver next day
        delivery_date = (now_ist + timedelta(days=1)).date()
    
    # Convert to datetime at midnight IST, then to UTC for storage
    # This ensures the date is stored correctly regardless of server timezone
    delivery_datetime_ist = ist.localize(datetime.combine(delivery_date, datetime.min.time()))
    delivery_datetime_utc = delivery_datetime_ist.astimezone(pytz.UTC)
    
    # Return as naive UTC datetime (MongoDB stores as UTC)
    delivery_datetime_naive_utc = delivery_datetime_utc.replace(tzinfo=None)
    
    logger.info(f"Order time IST: {now_ist.strftime('%Y-%m-%d %H:%M:%S')} (Hour: {current_hour_ist}) → Delivery date: {delivery_date} → Stored as UTC: {delivery_datetime_naive_utc}")
    
    return delivery_datetime_naive_utc


def get_delivery_date_info() -> dict:
    """
    Get delivery date information for display to customers.
    
    Returns a dict with:
    - delivery_date: The date string (YYYY-MM-DD)
    - delivery_date_formatted: Human readable format (e.g., "Monday, December 23, 2025")
    - day_name: Day of week (e.g., "Monday")
    - is_same_day: Whether it's same day delivery
    - order_cutoff_message: Message explaining the cutoff time
    
    Rules (all times in IST):
    - Orders between 12 midnight to 4 AM: Same day delivery
    - Orders between 4 AM to 12 midnight: Next day delivery
    """
    import pytz
    
    ist = pytz.timezone('Asia/Kolkata')
    now_ist = datetime.now(ist)
    current_hour = now_ist.hour
    
    # Calculate delivery date
    if current_hour < 4:
        # Before 4 AM IST - deliver same day
        delivery_date = now_ist.date()
        is_same_day = True
    else:
        # At or after 4 AM IST - deliver next day
        delivery_date = (now_ist + timedelta(days=1)).date()
        is_same_day = False
    
    # Format for display
    delivery_datetime = datetime.combine(delivery_date, datetime.min.time())
    formatted_date = delivery_datetime.strftime("%A, %B %d, %Y")
    day_name = delivery_datetime.strftime("%A")
    
    # Create cutoff message
    if is_same_day:
        cutoff_message = "Order now for same day delivery!"
    else:
        cutoff_message = f"Orders placed after 4 AM are delivered the next day"
    
    return {
        "delivery_date": delivery_date.strftime("%Y-%m-%d"),
        "delivery_date_formatted": formatted_date,
        "day_name": day_name,
        "is_same_day": is_same_day,
        "order_cutoff_message": cutoff_message,
        "current_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S")
    }


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
    
    # If user is an order agent, fetch owner's wallet balance
    if user_dict.get("user_type") == "order_agent" and user_dict.get("linked_owner_id"):
        owner_dict = await db.users.find_one({"id": user_dict["linked_owner_id"]})
        if owner_dict:
            # Use owner's wallet balance
            user_dict["wallet_balance"] = owner_dict.get("wallet_balance", 0.0)
    
    user = User(**user_dict)
    return user

async def get_current_user_optional(request: Request) -> User | None:
    """
    Optional authentication - returns User if authenticated, None if not
    Used for endpoints that should behave differently for authenticated vs unauthenticated users
    """
    try:
        # Get token from Authorization header
        auth_header = request.headers.get("Authorization")
        logger.info(f"get_current_user_optional: auth_header present: {auth_header is not None}")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.info("get_current_user_optional: No valid auth header, returning None")
            return None
        
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.info("get_current_user_optional: No username in token")
            return None
        
        user_dict = await db.users.find_one({"username": username})
        if user_dict is None:
            logger.info(f"get_current_user_optional: User {username} not found in DB")
            return None
        logger.info(f"get_current_user_optional: Found user {username}, role: {user_dict.get('role')}")
        return User(**user_dict)
    except Exception as e:
        logger.error(f"get_current_user_optional error: {str(e)}")
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
        "phone": normalize_phone_number(user_data.phone) if user_data.phone else None,
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
    
    # Check if account is active
    if not user_dict.get("is_active", True):
        logger.warning(f"Inactive account login attempt: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact admin for assistance.",
        )
    
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



# Password Reset Routes
@api_router.post("/auth/request-password-reset")
async def request_password_reset(request: PasswordResetRequest):
    """
    Step 1: Request password reset
    - User provides username or phone number
    - System generates 6-digit OTP
    - Returns WhatsApp link with pre-filled message
    """
    try:
        # Find user by username or phone
        user = await db.users.find_one({
            "$or": [
                {"username": request.identifier},
                {"phone": request.identifier}
            ]
        })
        
        if not user:
            # Don't reveal if user exists (security best practice)
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate 6-digit OTP
        import random
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        # Store OTP in database with expiry
        otp_id = str(uuid.uuid4())
        otp_dict = {
            "id": otp_id,
            "user_id": user["id"],
            "otp": otp,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=10),  # 10 minute expiry
            "used": False
        }
        
        await db.password_reset_otps.insert_one(otp_dict)
        
        # Format WhatsApp message
        message = f"""Divine Cakery - Password Reset
Your OTP: {otp}
Valid for 10 minutes.
Do not share this code."""
        
        # Get user's phone number
        phone = user.get("phone", "")
        if phone:
            # Normalize phone number (remove spaces, dashes, etc.)
            phone_clean = re.sub(r'[^\d+]', '', phone)
            if not phone_clean.startswith('+'):
                phone_clean = '+91' + phone_clean  # Assume India if no country code
        else:
            raise HTTPException(status_code=400, detail="User has no phone number registered")
        
        # Create WhatsApp link
        whatsapp_url = f"https://wa.me/{phone_clean}?text={message}"
        
        logger.info(f"Password reset OTP generated for user: {user['username']}, OTP ID: {otp_id}")
        
        return {
            "message": "OTP generated successfully",
            "whatsapp_url": whatsapp_url,
            "phone": phone,
            "otp_id": otp_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in request_password_reset: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate OTP")


@api_router.post("/auth/verify-otp")
async def verify_otp(request: PasswordResetVerifyOTP):
    """
    Step 2: Verify OTP
    - User provides identifier and OTP
    - System verifies OTP is correct and not expired
    - Returns reset token valid for 15 minutes
    """
    try:
        # Find user
        user = await db.users.find_one({
            "$or": [
                {"username": request.identifier},
                {"phone": request.identifier}
            ]
        })
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Find valid OTP for this user
        otp_record = await db.password_reset_otps.find_one({
            "user_id": user["id"],
            "otp": request.otp,
            "used": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
        # Mark OTP as used
        await db.password_reset_otps.update_one(
            {"id": otp_record["id"]},
            {"$set": {"used": True}}
        )
        
        # Generate reset token (valid for 15 minutes)
        reset_token = str(uuid.uuid4())
        reset_token_dict = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "reset_token": reset_token,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=15),
            "used": False
        }
        
        await db.password_reset_tokens.insert_one(reset_token_dict)
        
        logger.info(f"OTP verified for user: {user['username']}, reset token generated")
        
        return {
            "message": "OTP verified successfully",
            "reset_token": reset_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify_otp: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify OTP")


@api_router.post("/auth/reset-password")
async def reset_password(request: PasswordResetComplete):
    """
    Step 3: Reset password
    - User provides reset token and new password
    - System updates password
    """
    try:
        # Find valid reset token
        token_record = await db.password_reset_tokens.find_one({
            "reset_token": request.reset_token,
            "used": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not token_record:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Mark token as used
        await db.password_reset_tokens.update_one(
            {"id": token_record["id"]},
            {"$set": {"used": True}}
        )
        
        # Hash new password
        hashed_password = pwd_context.hash(request.new_password)
        
        # Update user password
        await db.users.update_one(
            {"id": token_record["user_id"]},
            {"$set": {"hashed_password": hashed_password}}
        )
        
        user = await db.users.find_one({"id": token_record["user_id"]})
        logger.info(f"Password reset successful for user: {user['username']}")
        
        return {"message": "Password reset successful"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in reset_password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset password")



# App Version Route
@api_router.get("/app-version/latest", response_model=AppVersionInfo)
async def get_latest_app_version():
    """
    Get latest app version information for update prompts.
    No authentication required - public endpoint.
    Returns the current production version details from database.
    """
    # Fetch version settings from database
    settings = await db.settings.find_one({"key": "app_version_settings"})
    
    if settings:
        return AppVersionInfo(
            latest_version=settings.get("latest_version", "1.0.16"),
            latest_version_code=settings.get("latest_version_code", 96),
            release_date=settings.get("release_date", "2025-12-21"),
            update_message=settings.get("update_message", "A new version is available with improvements and bug fixes."),
            minimum_supported_version=settings.get("minimum_supported_version"),
            minimum_supported_version_code=settings.get("minimum_supported_version_code")
        )
    
    # Default values if no settings in database
    return AppVersionInfo(
        latest_version="1.0.16",
        latest_version_code=96,
        release_date="2025-12-21",
        update_message="A new version is available with improvements and bug fixes.",
        minimum_supported_version=None,
        minimum_supported_version_code=None
    )


@api_router.get("/admin/settings/app-version")
async def get_app_version_settings(current_user: User = Depends(get_current_admin)):
    """Get app version settings for admin configuration"""
    settings = await db.settings.find_one({"key": "app_version_settings"})
    
    if settings:
        return {
            "latest_version": settings.get("latest_version", "1.0.16"),
            "latest_version_code": settings.get("latest_version_code", 96),
            "release_date": settings.get("release_date", "2025-12-21"),
            "update_message": settings.get("update_message", ""),
            "minimum_supported_version": settings.get("minimum_supported_version", ""),
            "minimum_supported_version_code": settings.get("minimum_supported_version_code", 0),
            "force_update_enabled": settings.get("minimum_supported_version_code", 0) > 0
        }
    
    return {
        "latest_version": "1.0.16",
        "latest_version_code": 96,
        "release_date": "2025-12-21",
        "update_message": "",
        "minimum_supported_version": "",
        "minimum_supported_version_code": 0,
        "force_update_enabled": False
    }


@api_router.put("/admin/settings/app-version")
async def update_app_version_settings(
    latest_version: str,
    latest_version_code: int,
    release_date: str,
    update_message: str = "",
    force_update_enabled: bool = False,
    minimum_supported_version: str = "",
    minimum_supported_version_code: int = 0,
    current_user: User = Depends(get_current_admin)
):
    """Update app version settings - admin only"""
    
    # If force update is disabled, clear minimum version requirements
    if not force_update_enabled:
        minimum_supported_version = None
        minimum_supported_version_code = None
    
    await db.settings.update_one(
        {"key": "app_version_settings"},
        {"$set": {
            "latest_version": latest_version,
            "latest_version_code": latest_version_code,
            "release_date": release_date,
            "update_message": update_message,
            "minimum_supported_version": minimum_supported_version,
            "minimum_supported_version_code": minimum_supported_version_code
        }},
        upsert=True
    )
    
    logger.info(f"Admin {current_user.username} updated app version settings: v{latest_version} (code {latest_version_code}), force_update={force_update_enabled}")
    
    return {
        "message": "App version settings updated successfully",
        "latest_version": latest_version,
        "latest_version_code": latest_version_code,
        "force_update_enabled": force_update_enabled,
        "minimum_supported_version": minimum_supported_version,
        "minimum_supported_version_code": minimum_supported_version_code
    }


# Delivery Date Endpoint (Public - for checkout page)
@api_router.get("/delivery-date")
async def get_expected_delivery_date():
    """
    Get the expected delivery date based on current IST time.
    
    Rules (all times in IST):
    - Orders between 12 midnight to 4 AM: Same day delivery
    - Orders between 4 AM to 12 midnight: Next day delivery
    
    This endpoint is public so customers can see the delivery date before logging in.
    """
    return get_delivery_date_info()


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
    
    # Compress image before storing in database
    if product_dict.get("image_base64"):
        original_size = len(product_dict["image_base64"])
        product_dict["image_base64"] = compress_base64_image(
            product_dict["image_base64"],
            max_width=800,
            quality=70
        )
        compressed_size = len(product_dict["image_base64"])
        logger.info(f"Product creation - Image compressed: {original_size} -> {compressed_size} bytes")
    
    # Ensure categories is populated - if empty, use category field
    if not product_dict.get("categories"):
        product_dict["categories"] = [product_dict["category"]] if product_dict.get("category") else []
    
    await db.products.insert_one(product_dict)
    return Product(**product_dict)


@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    is_available: Optional[bool] = None,
    include_admin: Optional[bool] = False,  # New parameter to include admin-only products
    current_user: User = Depends(get_current_user_optional)  # Optional auth for whitelist filtering
):
    query = {}
    if category:
        # Check both old 'category' field and new 'categories' array
        query["$or"] = [
            {"category": category},
            {"categories": category}
        ]
    else:
        # When showing "All" products AND include_admin is False (customer view)
        # Only show products that have at least one PUBLIC category
        if not include_admin:
            # Get all public (non-admin) category names
            public_categories = await db.categories.find({"is_admin_only": {"$ne": True}}).to_list(1000)
            public_category_names = [cat.get("name") for cat in public_categories]
            
            if public_category_names:
                # Show products that have at least one public category
                # Products can have multiple categories (e.g., ["Premium", "Packing"])
                # We want to show them if they have "Premium" even if they also have "Packing"
                query["$or"] = [
                    {"category": {"$in": public_category_names}},  # Old single category field
                    {"categories": {"$in": public_category_names}}  # New categories array - has at least one public category
                ]
        # If include_admin is True (admin view), no category filter - show all products
    
    if is_available is not None:
        query["is_available"] = is_available
    
    try:
        # Exclude image_base64 from list view to reduce response size
        products = await db.products.find(query, {"image_base64": 0}).to_list(1000)
        
        # Apply whitelist filter for authenticated non-admin users
        if current_user and current_user.role != UserRole.ADMIN:
            # Fetch user's allowed_product_ids from database (fresh data)
            user_data = await db.users.find_one({"id": current_user.id})
            allowed_product_ids = user_data.get("allowed_product_ids") if user_data else None
            
            # If user has whitelist set, filter products
            if allowed_product_ids and len(allowed_product_ids) > 0:
                logger.info(f"Applying whitelist filter for user {current_user.username}: {len(allowed_product_ids)} allowed products")
                products = [p for p in products if p.get("id") in allowed_product_ids]
                logger.info(f"After whitelist filter: {len(products)} products")
        
        # Process products with error handling
        processed_products = []
        for product in products:
            try:
                # Set image_base64 to empty string for list view
                product["image_base64"] = ""
                processed_products.append(Product(**product))
            except Exception as e:
                logger.error(f"Error processing product {product.get('id', 'unknown')}: {str(e)}")
                # Skip malformed products instead of crashing
                continue
        
        logger.info(f"Successfully loaded {len(processed_products)} products")
        return processed_products
    except Exception as e:
        logger.error(f"Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")


@api_router.get("/debug/system-info")
async def get_system_info():
    """Debug endpoint to check system configuration"""
    import platform
    import sys
    
    mongo_url = os.environ.get("MONGO_URL", "Not set")
    # Mask sensitive parts of connection string
    if "mongodb" in mongo_url:
        if "@" in mongo_url:
            mongo_display = mongo_url.split("@")[0].split("//")[0] + "//***:***@" + mongo_url.split("@")[1]
        else:
            mongo_display = mongo_url
    else:
        mongo_display = mongo_url
    
    return {
        "python_version": sys.version,
        "platform": platform.platform(),
        "mongodb_url": mongo_display,
        "environment": "production" if "render.com" in mongo_url else "development",
        "pillow_available": True  # We know it's available since we import it
    }

@api_router.post("/admin/migrate-compress-images")
async def migrate_compress_images_endpoint(
    current_user: User = Depends(get_current_admin)
):
    """Admin endpoint to compress all product images in database"""
    import time
    
    start_time = time.time()
    
    # Get all products with images
    products = await db.products.find({"image_base64": {"$exists": True, "$ne": ""}}).to_list(None)
    
    compressed_count = 0
    skipped_count = 0
    total_original_size = 0
    total_compressed_size = 0
    results = []
    
    for product in products:
        product_id = product.get("id")
        product_name = product.get("name", "Unknown")
        original_image = product.get("image_base64", "")
        original_size = len(original_image)
        
        # Skip if already compressed (less than 100KB)
        if original_size < 100000:
            skipped_count += 1
            continue
        
        # Compress the image
        compressed_image = compress_base64_image(original_image, max_width=800, quality=70)
        compressed_size = len(compressed_image)
        reduction = ((original_size - compressed_size) / original_size) * 100
        
        # Update in database
        await db.products.update_one(
            {"id": product_id},
            {"$set": {"image_base64": compressed_image}}
        )
        
        total_original_size += original_size
        total_compressed_size += compressed_size
        compressed_count += 1
        
        results.append({
            "name": product_name,
            "original_size": original_size,
            "compressed_size": compressed_size,
            "reduction_percent": round(reduction, 1)
        })
    
    elapsed_time = time.time() - start_time
    
    return {
        "success": True,
        "message": "Image compression migration completed",
        "stats": {
            "total_products": len(products),
            "compressed": compressed_count,
            "skipped": skipped_count,
            "original_size_mb": round(total_original_size / 1024 / 1024, 2),
            "compressed_size_mb": round(total_compressed_size / 1024 / 1024, 2),
            "space_saved_mb": round((total_original_size - total_compressed_size) / 1024 / 1024, 2),
            "time_taken_seconds": round(elapsed_time, 2)
        },
        "details": results[:10]  # Show first 10 for brevity
    }

@api_router.post("/admin/fix-image-prefixes")
async def fix_image_prefixes_endpoint(
    current_user: User = Depends(get_current_admin)
):
    """Admin endpoint to add data URI prefix to images missing it"""
    import time
    
    start_time = time.time()
    
    # Find products with images that don't start with 'data:'
    products = await db.products.find({
        "image_base64": {
            "$exists": True,
            "$ne": "",
            "$not": {"$regex": "^data:"}
        }
    }).to_list(None)
    
    logger.info(f"Found {len(products)} products with images missing data URI prefix")
    
    fixed_count = 0
    error_count = 0
    results = []
    
    for product in products:
        product_id = product.get("id")
        product_name = product.get("name", "Unknown")
        original_image = product.get("image_base64", "")
        
        # Skip if image is None or very short (likely corrupted)
        if not original_image or len(original_image) < 100:
            error_count += 1
            logger.warning(f"Skipping {product_name}: image too short or empty")
            continue
        
        # Add data URI prefix
        fixed_image = f"data:image/jpeg;base64,{original_image}"
        
        # Update in database
        result = await db.products.update_one(
            {"id": product_id},
            {"$set": {"image_base64": fixed_image}}
        )
        
        if result.modified_count > 0:
            fixed_count += 1
            results.append({
                "name": product_name,
                "status": "fixed",
                "original_length": len(original_image),
                "new_length": len(fixed_image)
            })
        else:
            error_count += 1
            results.append({
                "name": product_name,
                "status": "failed",
                "error": "Database update failed"
            })
    
    # Verify fix
    remaining = await db.products.count_documents({
        "image_base64": {
            "$exists": True,
            "$ne": "",
            "$not": {"$regex": "^data:"}
        }
    })
    
    elapsed_time = time.time() - start_time
    
    return {
        "success": True,
        "message": "Image prefix fix completed",
        "stats": {
            "total_found": len(products),
            "fixed": fixed_count,
            "errors": error_count,
            "remaining_without_prefix": remaining,
            "time_taken_seconds": round(elapsed_time, 2)
        },
        "details": results[:20]  # Show first 20 for brevity
    }


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    import time
    
    # Time the database query
    start_query = time.time()
    product = await db.products.find_one({"id": product_id})
    query_time = time.time() - start_query
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Images are now pre-compressed in database, no need to compress on read
    if product.get("image_base64"):
        image_size = len(product["image_base64"])
        logger.info(f"TIMING - Product {product_id}: Query={query_time:.3f}s, ImageSize={image_size} bytes (pre-compressed in DB)")
    else:
        logger.info(f"TIMING - Product {product_id}: Query={query_time:.3f}s, No image")
    
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
    
    # Compress image if being updated
    if "image_base64" in update_data and update_data["image_base64"]:
        original_size = len(update_data["image_base64"])
        update_data["image_base64"] = compress_base64_image(
            update_data["image_base64"],
            max_width=800,
            quality=70
        )
        compressed_size = len(update_data["image_base64"])
        logger.info(f"Product update - Image compressed: {original_size} -> {compressed_size} bytes")
    
    # Ensure categories is populated - if empty or not provided, use category field
    if "categories" in update_data and not update_data.get("categories"):
        update_data["categories"] = [update_data["category"]] if update_data.get("category") else []
    elif "category" in update_data and "categories" not in update_data:
        # If only category is provided, also update categories array
        update_data["categories"] = [update_data["category"]]
    
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
    
    # Get products from favorites list (exclude images for performance)
    products = await db.products.find(
        {"id": {"$in": favorite_product_ids}},
        {"image_base64": 0}  # Exclude images from response
    ).to_list(1000)
    
    # Set empty image for response
    for product in products:
        product["image_base64"] = ""
    
    return [Product(**product) for product in products]



# Stock Reset Event Endpoints
@api_router.post("/admin/stock/reset-all")
async def reset_all_stock(
    current_user: User = Depends(get_current_admin)
):
    """Reset all products stock to 0 and record the event"""
    try:
        from models import StockResetEvent
        
        # Get all products
        products = await db.products.find({}).to_list(10000)
        products_count = len(products)
        
        # Reset all products closing_stock to 0
        await db.products.update_many(
            {},
            {"$set": {"closing_stock": 0}}
        )
        
        # Create stock reset event record
        reset_event = {
            "id": str(uuid.uuid4()),
            "reset_date": datetime.utcnow(),
            "reset_by": current_user.username,
            "products_count": products_count,
            "notes": f"Stock reset for all {products_count} products"
        }
        
        await db.stock_reset_events.insert_one(reset_event)
        
        return {
            "message": f"Successfully reset stock for {products_count} products",
            "products_count": products_count,
            "reset_event": StockResetEvent(**reset_event)
        }
    except Exception as e:
        logger.error(f"Error resetting stock: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reset stock: {str(e)}")


@api_router.get("/admin/stock/reset-history")
async def get_stock_reset_history(
    limit: int = 30,
    current_user: User = Depends(get_current_admin)
):
    """Get stock reset history for the last month (or specified limit)"""
    try:
        from models import StockResetEvent
        
        # Get last N reset events, sorted by most recent first
        events = await db.stock_reset_events.find({}).sort("reset_date", -1).limit(limit).to_list(limit)
        
        return [StockResetEvent(**event) for event in events]
    except Exception as e:
        logger.error(f"Error fetching stock reset history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")



# Wallet Routes
@api_router.get("/wallet", response_model=WalletResponse)
async def get_wallet(current_user: User = Depends(get_current_user)):
    # Order agents use their linked owner's wallet
    wallet_user_id = current_user.id
    if current_user.user_type == "order_agent" and current_user.linked_owner_id:
        wallet_user_id = current_user.linked_owner_id
    
    wallet = await db.wallets.find_one({"user_id": wallet_user_id})
    if not wallet:
        # Create wallet if it doesn't exist
        wallet = {
            "user_id": wallet_user_id,
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
        # Enhanced debug logging
        logger.info(f"🔍🔍🔍 PAYMENT REQUEST DEBUG START 🔍🔍🔍")
        logger.info(f"🔍 transaction_type: {payment_data.transaction_type} (type: {type(payment_data.transaction_type)})")
        logger.info(f"🔍 amount: {payment_data.amount}")
        logger.info(f"🔍 has_notes: {payment_data.notes is not None}")
        logger.info(f"🔍 user_id: {current_user.id}")
        logger.info(f"🔍 username: {current_user.username}")
        
        if payment_data.notes:
            logger.info(f"🔍 Notes keys: {list(payment_data.notes.keys())}")
            logger.info(f"🔍 Notes content (first 500 chars): {str(payment_data.notes)[:500]}")
            if 'order_data' in payment_data.notes:
                order_data = payment_data.notes['order_data']
                logger.info(f"🔍 Order data found!")
                logger.info(f"🔍 Order customer_id: {order_data.get('customer_id')}")
                logger.info(f"🔍 Order items count: {len(order_data.get('items', []))}")
                logger.info(f"🔍 Order total_amount: {order_data.get('total_amount')}")
            else:
                logger.warning(f"⚠️ No order_data in notes! This will be treated as wallet topup!")
        else:
            logger.warning(f"⚠️ No notes provided! This will be treated as wallet topup!")
        
        logger.info(f"🔍🔍🔍 PAYMENT REQUEST DEBUG END 🔍🔍🔍")
        
        # Create transaction record first
        transaction_id = str(uuid.uuid4())
        
        # Create Payment Link in Razorpay
        short_user_id = str(current_user.id)[:8]
        timestamp = int(datetime.utcnow().timestamp())
        # Add microseconds to make reference_id more unique for rapid testing
        microseconds = datetime.utcnow().microsecond
        reference_id = f"txn_{short_user_id}_{timestamp}_{microseconds}"[:40]
        
        # Build customer data - only include fields that have values
        customer_data = {}
        if current_user.business_name or current_user.username:
            customer_data["name"] = current_user.business_name or current_user.username
        if current_user.phone:
            customer_data["contact"] = normalize_phone_number(current_user.phone)
        if current_user.email:
            customer_data["email"] = current_user.email
        
        payment_link_data = {
            "amount": int(payment_data.amount * 100),  # Convert to paise
            "currency": "INR",
            "description": f"{payment_data.transaction_type.title()} - Divine Cakery",
            "notify": {
                "sms": False,
                "email": False
            },
            "reminder_enable": False,
            "reference_id": reference_id,
            "notes": {
                "user_id": current_user.id,
                "transaction_id": transaction_id,
                "transaction_type": payment_data.transaction_type
            },
            "callback_url": f"{os.environ.get('BACKEND_URL', 'http://localhost:8001')}/api/payments/callback",
            "callback_method": "get"
        }
        
        # Add customer data only if we have some info
        if customer_data:
            payment_link_data["customer"] = customer_data
        
        # Add any additional notes (but exclude large order_data for Razorpay)
        if payment_data.notes:
            # Only send essential data to Razorpay (due to 255 char limit)
            razorpay_notes = {}
            for key, value in payment_data.notes.items():
                if key != "order_data":  # Skip order_data for Razorpay
                    razorpay_notes[key] = value
            
            # Check total length before sending to Razorpay
            total_notes = {**payment_link_data["notes"], **razorpay_notes}
            notes_str = json.dumps(total_notes)
            logger.info(f"Razorpay notes length: {len(notes_str)} chars: {notes_str[:200]}...")
            
            if len(notes_str) <= 255:
                payment_link_data["notes"].update(razorpay_notes)
            else:
                logger.warning(f"Notes too long for Razorpay ({len(notes_str)} chars), skipping additional notes")
        
        logger.info(f"Creating payment link with data: amount={payment_link_data['amount']}, callback={payment_link_data['callback_url']}")
        
        # Retry logic for handling transient connection errors
        max_retries = 3
        retry_delay = 1  # seconds
        payment_link = None
        
        for attempt in range(max_retries):
            try:
                # Call Razorpay API with timeout handling
                payment_link = razorpay_client.payment_link.create(payment_link_data)
                logger.info(f"Payment link created successfully: {payment_link.get('id')}")
                break  # Success, exit retry loop
            except Exception as razorpay_error:
                error_type = type(razorpay_error).__name__
                error_msg = str(razorpay_error)
                
                # Check if it's a connection-related error that we should retry
                is_connection_error = (
                    'ConnectionResetError' in error_type or
                    'ConnectionResetError' in error_msg or
                    'Connection reset' in error_msg or
                    'Connection aborted' in error_msg
                )
                
                if is_connection_error and attempt < max_retries - 1:
                    # Transient connection error, retry
                    logger.warning(f"Attempt {attempt + 1}/{max_retries}: Connection error, retrying in {retry_delay}s... Error: {error_msg}")
                    import time
                    time.sleep(retry_delay)
                    continue
                else:
                    # Non-retryable error or final attempt failed
                    logger.error(f"Razorpay API error after {attempt + 1} attempts: {error_type} - {error_msg}")
                    raise HTTPException(
                        status_code=503, 
                        detail=f"Payment gateway temporarily unavailable. Please try again in a moment."
                    )
        
        if not payment_link:
            raise HTTPException(
                status_code=503,
                detail="Failed to create payment link after multiple attempts. Please try again."
            )
        
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


@api_router.post("/payments/webhook")
async def payment_webhook(request: Request):
    """
    Razorpay webhook endpoint - receives payment notifications from Razorpay
    This is the proper way to handle payment confirmations
    """
    try:
        # Get webhook payload
        payload = await request.json()
        logger.info(f"Webhook received: {payload.get('event', 'unknown event')}")
        
        event = payload.get("event")
        payment_entity = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
        
        if event == "payment_link.paid":
            payment_link_id = payment_entity.get("id")
            reference_id = payment_entity.get("reference_id")
            amount = payment_entity.get("amount", 0) / 100  # Convert from paise
            
            logger.info(f"Payment link paid: link_id={payment_link_id}, reference_id={reference_id}, amount={amount}")
            
            # Find transaction by payment link ID or reference ID
            transaction = await db.transactions.find_one({
                "$or": [
                    {"razorpay_payment_link_id": payment_link_id},
                    {"id": reference_id}
                ]
            })
            
            if not transaction:
                logger.error(f"Transaction not found for payment_link_id: {payment_link_id}")
                return {"status": "error", "message": "Transaction not found"}
            
            # Update transaction status
            await db.transactions.update_one(
                {"id": transaction["id"]},
                {
                    "$set": {
                        "razorpay_payment_link_id": payment_link_id,
                        "status": TransactionStatus.SUCCESS,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Handle different transaction types
            if transaction["transaction_type"] == TransactionType.WALLET_TOPUP:
                user_id = transaction["user_id"]
                amount = transaction["amount"]
                
                # Update wallet balance
                await db.wallets.update_one(
                    {"user_id": user_id},
                    {
                        "$inc": {"balance": amount},
                        "$set": {"updated_at": datetime.utcnow()}
                    }
                )
                
                # Update user's wallet balance
                await db.users.update_one(
                    {"id": user_id},
                    {"$inc": {"wallet_balance": amount}}
                )
                
                logger.info(f"✅ Wallet updated successfully: user_id={user_id}, amount={amount}")
            
            elif transaction["transaction_type"] == TransactionType.ORDER_PAYMENT:
                # Create the order after successful payment
                order_data = transaction.get("notes", {}).get("order_data")
                
                if order_data:
                    # Generate order number
                    order_number = await generate_order_number()
                    order_id = str(uuid.uuid4())
                    
                    # Calculate delivery date using backend logic (IST timezone)
                    # This ensures consistent delivery date calculation regardless of customer's device timezone
                    delivery_date = calculate_delivery_date()
                    
                    # Create order document
                    order_dict = {
                        "id": order_id,
                        "order_number": order_number,
                        "customer_id": order_data.get("customer_id"),  # Primary field
                        "user_id": order_data.get("customer_id"),  # Backward compatibility
                        "items": order_data["items"],
                        "total_amount": order_data["total_amount"],
                        "delivery_date": delivery_date,  # Always use backend-calculated date
                        "delivery_address": order_data.get("delivery_address"),
                        "delivery_notes": order_data.get("delivery_notes"),
                        "notes": order_data.get("notes"),
                        "order_type": order_data.get("order_type", "delivery"),  # Use order_type instead of onsite_pickup
                        "payment_method": order_data.get("payment_method", "razorpay"),
                        "payment_status": "paid",
                        "order_status": OrderStatus.PENDING,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    
                    # Insert order
                    await db.orders.insert_one(order_dict)
                    
                    # Mark transaction as having created an order
                    await db.transactions.update_one(
                        {"id": transaction["id"]},
                        {"$set": {"order_created": True, "order_id": order_id}}
                    )
                    
                    logger.info(f"✅ Order created successfully after payment: order_id={order_id}, order_number={order_number}, customer_id={order_data['customer_id']}")
                else:
                    logger.error("Order data not found in transaction notes")
            
            return {"status": "success", "message": "Payment processed"}
        
        else:
            logger.info(f"Unhandled webhook event: {event}")
            return {"status": "ok", "message": "Event received"}
    
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return {"status": "error", "message": str(e)}


@api_router.get("/payments/callback")
async def payment_callback(
    request: Request,
    razorpay_payment_id: str = None,
    razorpay_payment_link_id: str = None,
    razorpay_payment_link_reference_id: str = None,
    razorpay_payment_link_status: str = None,
    razorpay_signature: str = None
):
    """
    Razorpay callback endpoint - redirects user back to app after payment
    NOTE: This is just for user redirect, not for payment processing
    """
    try:
        # Log all query parameters for debugging
        logger.info(f"Payment callback received with params: {dict(request.query_params)}")
        logger.info(f"Payment callback: payment_id={razorpay_payment_id}, link_id={razorpay_payment_link_id}, status={razorpay_payment_link_status}")
        
        if razorpay_payment_link_status == "paid":
            # Find transaction by payment link ID
            transaction = await db.transactions.find_one({
                "razorpay_payment_link_id": razorpay_payment_link_id
            })
            
            if not transaction:
                logger.error(f"Transaction not found for payment_link_id: {razorpay_payment_link_id}")
                return RedirectResponse(url="/payment-failed")
            
            # Update transaction status
            await db.transactions.update_one(
                {"id": transaction["id"]},
                {
                    "$set": {
                        "razorpay_payment_id": razorpay_payment_id,
                        "status": TransactionStatus.SUCCESS,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Update wallet if wallet topup
            if transaction["transaction_type"] == TransactionType.WALLET_TOPUP:
                user_id = transaction["user_id"]
                amount = transaction["amount"]
                
                # Update wallet balance
                await db.wallets.update_one(
                    {"user_id": user_id},
                    {
                        "$inc": {"balance": amount},
                        "$set": {"updated_at": datetime.utcnow()}
                    }
                )
                
                # Update user's wallet balance
                await db.users.update_one(
                    {"id": user_id},
                    {"$inc": {"wallet_balance": amount}}
                )
                
                # Get user details for notification
                user = await db.users.find_one({"id": user_id})
                
                # Send WhatsApp confirmation if phone available
                if user and user.get("phone"):
                    phone = user["phone"]
                    # Normalize phone number
                    phone_normalized = normalize_phone_number(phone).replace("+", "")
                    message = f"✅ Payment Successful! ₹{amount:.2f} has been added to your Divine Cakery wallet. Thank you!"
                    
                    # Log for now (WhatsApp integration can be added later)
                    logger.info(f"Would send WhatsApp to {phone_normalized}: {message}")
                
                logger.info(f"Wallet updated: user_id={user_id}, amount={amount}")
            
            # Return success page or redirect
            return {"status": "success", "message": "Payment successful and wallet updated"}
        
        else:
            logger.warning(f"Payment not successful: status={razorpay_payment_link_status}")
            return {"status": "failed", "message": "Payment was not successful"}
    
    except Exception as e:
        logger.error(f"Error in payment callback: {str(e)}")
        return {"status": "error", "message": str(e)}


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
    Generates simple sequential order number starting from 101
    No prefix, just incrementing numbers: 101, 102, 103, etc.
    """
    # Use MongoDB's findOneAndUpdate with atomic increment for thread-safe counter
    counter_doc = await db.counters.find_one_and_update(
        {"_id": "order_counter"},
        {"$inc": {"sequence": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER  # Return the updated document
    )
    
    # Get the sequence number, default to 101 if this is the first order
    sequence = counter_doc.get("sequence", 101)
    
    # Ensure minimum is 101
    if sequence < 101:
        # Set counter to 101 if it's somehow less
        await db.counters.update_one(
            {"_id": "order_counter"},
            {"$set": {"sequence": 101}}
        )
        sequence = 101
    
    # Return simple number as string
    return str(sequence)


# Order Routes
@api_router.post("/orders", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    # Check if payment method is pay_later
    if order_data.payment_method == "pay_later":
        # Verify user has pay_later enabled
        user_data = await db.users.find_one({"id": current_user.id})
        if not user_data or not user_data.get("pay_later_enabled", False):
            raise HTTPException(status_code=400, detail="Pay Later is not enabled for your account")
        
        # Check if order amount exceeds limit
        pay_later_max_limit = user_data.get("pay_later_max_limit", 0)
        if order_data.total_amount > pay_later_max_limit:
            raise HTTPException(
                status_code=400, 
                detail="Your order value exceeds limit. Please contact Divine Cakery"
            )
        
        payment_status = "pending"  # Pay Later orders have pending payment
    # Check if payment method is wallet
    elif order_data.payment_method == "wallet":
        # Order agents use their linked owner's wallet
        wallet_user_id = current_user.id
        if current_user.user_type == "order_agent" and current_user.linked_owner_id:
            wallet_user_id = current_user.linked_owner_id
        
        wallet = await db.wallets.find_one({"user_id": wallet_user_id})
        if not wallet or wallet["balance"] < order_data.total_amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        
        # Deduct from wallet (owner's wallet for order agents)
        await db.wallets.update_one(
            {"user_id": wallet_user_id},
            {
                "$inc": {"balance": -order_data.total_amount},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        await db.users.update_one(
            {"id": wallet_user_id},
            {"$inc": {"wallet_balance": -order_data.total_amount}}
        )
        
        payment_status = "completed"
    else:
        payment_status = "pending"
    
    # Calculate delivery date based on IST time and 4 AM cutoff
    delivery_date = calculate_delivery_date()
    
    # STANDING ORDER OVERRIDE: Delete auto-generated standing order for this customer on this delivery date
    # Manual customer orders take precedence over auto-generated ones
    delivery_date_only = delivery_date.replace(hour=0, minute=0, second=0, microsecond=0)
    await db.orders.delete_many({
        "user_id": current_user.id,
        "delivery_date": delivery_date_only,
        "is_standing_order": True
    })
    
    # Create order with both UUID id and sequential order_number
    order_id = str(uuid.uuid4())
    order_number = await generate_order_number()
    order_dict = {
        "id": order_id,
        "order_number": order_number,
        "customer_id": current_user.id,  # Use customer_id for consistency
        "user_id": current_user.id,  # Keep user_id for backward compatibility
        "items": [item.dict() for item in order_data.items],
        "subtotal": order_data.subtotal,
        "delivery_charge": order_data.delivery_charge,
        "discount_amount": order_data.discount_amount,
        "total_amount": order_data.total_amount,
        "payment_method": order_data.payment_method,
        "payment_status": payment_status,
        "order_status": OrderStatus.PENDING,  # Pay Later orders stay pending until admin confirms
        "order_type": order_data.order_type,
        "delivery_address": order_data.delivery_address or current_user.address,
        "delivery_date": delivery_date,
        "notes": order_data.notes,
        "is_pay_later": order_data.payment_method == "pay_later",  # Flag for highlighting in admin
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




@api_router.delete("/admin/orders/cleanup")
async def delete_old_orders(current_user: User = Depends(get_current_admin)):
    """
    Admin endpoint to delete orders older than 7 days.
    WARNING: This permanently deletes data!
    """
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    # Count orders to be deleted
    count_to_delete = await db.orders.count_documents({"created_at": {"$lt": seven_days_ago}})
    
    # Delete old orders
    result = await db.orders.delete_many({"created_at": {"$lt": seven_days_ago}})
    
    logger.info(f"Deleted {result.deleted_count} orders older than 7 days")
    
    return {
        "success": True,
        "message": f"Deleted {result.deleted_count} orders older than 7 days",
        "deleted_count": result.deleted_count
    }

@api_router.get("/orders")
async def get_orders(
    delivery_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get orders for the current user. Only shows orders from last 7 days."""
    
    # Filter: Only show orders from last 7 days for performance
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    # Build query based on user role and type
    if current_user.role == UserRole.ADMIN:
        query = {"created_at": {"$gte": seven_days_ago}}  # Only last 7 days
    elif current_user.user_type == "owner":
        # Owner sees their own orders AND orders placed by their linked order agent
        user_ids = [current_user.id]
        # Find if this owner has a linked order agent
        linked_agent = await db.users.find_one({"linked_owner_id": current_user.id})
        if linked_agent:
            user_ids.append(linked_agent["id"])
        query = {
            "user_id": {"$in": user_ids},
            "created_at": {"$gte": seven_days_ago}  # Only last 7 days
        }
    else:
        # Order agent or regular customer sees only their own orders
        query = {
            "user_id": current_user.id,
            "created_at": {"$gte": seven_days_ago}  # Only last 7 days
        }
    
    # Add delivery date filter if provided
    if delivery_date:
        try:
            # Parse the date string
            filter_date = datetime.fromisoformat(delivery_date.replace('Z', '+00:00'))
            # Create start and end of the delivery date
            start_of_day = filter_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = filter_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            # Filter by delivery_date field (used by standing orders and regular orders)
            query["delivery_date"] = {"$gte": start_of_day, "$lte": end_of_day}
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(1000)
    
    # IST timezone for delivery date conversion
    ist = pytz.timezone('Asia/Kolkata')
    
    # Enrich orders with user information for admin view
    enriched_orders = []
    for order in orders:
        # Remove MongoDB _id field to avoid serialization issues
        order.pop('_id', None)
        order_dict = dict(order)
        
        # Convert delivery_date to IST date string for correct display on all app versions
        if order_dict.get("delivery_date"):
            delivery_dt = order_dict["delivery_date"]
            # Check if it's a datetime object (not a string)
            if isinstance(delivery_dt, datetime):
                delivery_utc = delivery_dt.replace(tzinfo=pytz.UTC)
                delivery_ist = delivery_utc.astimezone(ist)
                # Add formatted IST date string for display
                order_dict["delivery_date_ist"] = delivery_ist.strftime("%Y-%m-%d")
                order_dict["delivery_date_formatted"] = delivery_ist.strftime("%A, %B %d, %Y")
                # CRITICAL: Override delivery_date to be the IST date at noon UTC
                # This ensures that when any app parses this datetime in any timezone,
                # the DATE portion will always show the correct IST delivery date
                # (noon UTC gives a buffer so even UTC-12 to UTC+14 timezones show same date)
                order_dict["delivery_date"] = f"{delivery_ist.strftime('%Y-%m-%d')}T12:00:00.000Z"
            elif isinstance(delivery_dt, str):
                # If it's already a string, try to parse and convert
                try:
                    # Try to parse ISO format string
                    if 'T' in delivery_dt:
                        parsed_dt = datetime.fromisoformat(delivery_dt.replace('Z', '+00:00'))
                    else:
                        parsed_dt = datetime.strptime(delivery_dt[:10], '%Y-%m-%d')
                    
                    if parsed_dt.tzinfo is None:
                        parsed_dt = parsed_dt.replace(tzinfo=pytz.UTC)
                    delivery_ist = parsed_dt.astimezone(ist)
                    order_dict["delivery_date_ist"] = delivery_ist.strftime("%Y-%m-%d")
                    order_dict["delivery_date_formatted"] = delivery_ist.strftime("%A, %B %d, %Y")
                    order_dict["delivery_date"] = f"{delivery_ist.strftime('%Y-%m-%d')}T12:00:00.000Z"
                except:
                    # If parsing fails, just use the string as-is
                    order_dict["delivery_date_ist"] = delivery_dt[:10] if len(delivery_dt) >= 10 else delivery_dt
                    order_dict["delivery_date_formatted"] = delivery_dt
        
        # Fetch user information (handle both user_id and customer_id fields)
        user_id = order_dict.get("user_id") or order_dict.get("customer_id")
        if user_id:
            user = await db.users.find_one({"id": user_id})
            if user:
                order_dict["user_name"] = user.get("username", "N/A")
                order_dict["user_phone"] = user.get("phone", None)
            # Ensure user_id field exists for consistency
            order_dict["user_id"] = user_id
        enriched_orders.append(order_dict)
    
    return enriched_orders


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user.role != UserRole.ADMIN and order["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Remove MongoDB _id field
    order.pop('_id', None)
    order_dict = dict(order)
    
    # Convert delivery_date to IST date string for correct display
    ist = pytz.timezone('Asia/Kolkata')
    if order_dict.get("delivery_date"):
        delivery_dt = order_dict["delivery_date"]
        if hasattr(delivery_dt, 'replace'):
            delivery_utc = delivery_dt.replace(tzinfo=pytz.UTC)
            delivery_ist = delivery_utc.astimezone(ist)
            order_dict["delivery_date_ist"] = delivery_ist.strftime("%Y-%m-%d")
            order_dict["delivery_date_formatted"] = delivery_ist.strftime("%A, %B %d, %Y")
            # Override delivery_date to show correct date in any timezone
            order_dict["delivery_date"] = f"{delivery_ist.strftime('%Y-%m-%d')}T12:00:00.000Z"
    
    return order_dict


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


@api_router.get("/transactions/{transaction_id}")
async def get_transaction_status(
    transaction_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get status of a specific transaction
    Used to check if payment was completed after user returns from Razorpay
    """
    transaction = await db.transactions.find_one({
        "id": transaction_id,
        "user_id": current_user.id
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "id": transaction["id"],
        "status": transaction["status"],
        "transaction_type": transaction["transaction_type"],
        "amount": transaction["amount"],
        "created_at": transaction["created_at"],
        "order_created": transaction.get("order_created", False)
    }



# Admin Routes
@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(current_user: User = Depends(get_current_admin)):
    users = await db.users.find().to_list(1000)
    
    # Enrich users with wallet balance
    enriched_users = []
    for user in users:
        try:
            # Ensure required fields exist with defaults
            if "id" not in user:
                logger.error(f"User missing 'id' field: {user.get('username', 'unknown')}")
                continue
            
            if "created_at" not in user:
                user["created_at"] = datetime.utcnow()
            
            if "is_active" not in user:
                user["is_active"] = True
                
            if "is_approved" not in user:
                user["is_approved"] = True
                
            if "favorite_products" not in user:
                user["favorite_products"] = []
            
            # Fetch wallet balance for each user
            wallet = await db.wallets.find_one({"user_id": user["id"]})
            user["wallet_balance"] = wallet.get("balance", 0.0) if wallet else 0.0
            
            enriched_users.append(User(**user))
        except Exception as e:
            logger.error(f"Failed to process user {user.get('username', 'unknown')}: {str(e)}")
            continue
    
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
        "phone": normalize_phone_number(user_data.phone) if user_data.phone else None,
        "role": UserRole.CUSTOMER,
        "business_name": user_data.business_name,
        "address": user_data.address,
        "wallet_balance": 0.0,
        "can_topup_wallet": user_data.can_topup_wallet,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True,
        "is_approved": True,  # Admin-created users are pre-approved
        "favorite_products": [],
        "user_type": user_data.user_type if hasattr(user_data, 'user_type') else "owner",
        "linked_owner_id": user_data.linked_owner_id if hasattr(user_data, 'linked_owner_id') else None,
        "onsite_pickup_only": user_data.onsite_pickup_only if hasattr(user_data, 'onsite_pickup_only') else False,
        "delivery_charge_waived": user_data.delivery_charge_waived if hasattr(user_data, 'delivery_charge_waived') else False
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


@api_router.post("/admin/create-order-agent")
async def create_order_agent(
    owner_id: str,
    agent_data: UserCreate,
    current_user: User = Depends(get_current_admin)
):
    """
    Create an Order Agent linked to an Owner.
    Order Agent has restricted payment access.
    """
    # Check if owner exists and is actually an owner
    owner = await db.users.find_one({"id": owner_id})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    if owner.get("user_type") != "owner":
        raise HTTPException(status_code=400, detail="Target user must be an owner")
    
    # Check if owner already has an order agent
    existing_agent = await db.users.find_one({"linked_owner_id": owner_id})
    if existing_agent:
        raise HTTPException(status_code=400, detail="This owner already has an order agent")
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": agent_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create order agent
    agent_id = str(uuid.uuid4())
    hashed_password = get_password_hash(agent_data.password)
    
    agent_dict = {
        "id": agent_id,
        "username": agent_data.username,
        "email": agent_data.email,
        "phone": normalize_phone_number(agent_data.phone) if agent_data.phone else None,
        "role": UserRole.CUSTOMER,
        "business_name": owner.get("business_name", ""),
        "address": owner.get("address", ""),
        "wallet_balance": 0.0,
        "can_topup_wallet": False,  # Order agents cannot top up
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True,
        "is_approved": True,
        "favorite_products": [],
        "user_type": "order_agent",
        "linked_owner_id": owner_id,
        "onsite_pickup_only": owner.get("onsite_pickup_only", False),
        "delivery_charge_waived": owner.get("delivery_charge_waived", False)
    }
    
    await db.users.insert_one(agent_dict)
    
    # Order agent shares wallet with owner (no separate wallet)
    
    return {
        "message": "Order agent created successfully",
        "agent_id": agent_id,
        "agent_username": agent_data.username,
        "linked_to_owner": owner.get("username")
    }


@api_router.get("/admin/get-linked-agent/{owner_id}")
async def get_linked_agent(
    owner_id: str,
    current_user: User = Depends(get_current_admin)
):
    """Get the order agent linked to an owner"""
    agent = await db.users.find_one({"linked_owner_id": owner_id})
    
    if not agent:
        return {"has_agent": False, "agent": None}
    
    return {
        "has_agent": True,
        "agent": {
            "id": agent["id"],
            "username": agent["username"],
            "email": agent.get("email"),
            "phone": agent.get("phone"),
            "is_active": agent.get("is_active", True),
            "created_at": agent.get("created_at")
        }
    }


@api_router.delete("/admin/unlink-order-agent/{agent_id}")
async def unlink_order_agent(
    agent_id: str,
    current_user: User = Depends(get_current_admin)
):
    """Delete/unlink an order agent"""
    agent = await db.users.find_one({"id": agent_id, "user_type": "order_agent"})
    
    if not agent:
        raise HTTPException(status_code=404, detail="Order agent not found")
    
    # Delete the agent
    await db.users.delete_one({"id": agent_id})
    
    return {"message": "Order agent deleted successfully"}


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


@api_router.put("/admin/users/{user_id}/toggle-active")
async def toggle_user_active_status(
    user_id: str,
    current_user: User = Depends(get_current_admin)
):
    """Toggle user active/inactive status"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_status = user.get("is_active", True)
    new_status = not current_status
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": new_status}}
    )
    
    status_text = "activated" if new_status else "deactivated"
    logger.info(f"Admin {current_user.username} {status_text} user {user.get('username')} ({user_id})")
    
    return {
        "message": f"User {status_text} successfully",
        "user_id": user_id,
        "username": user.get("username"),
        "is_active": new_status
    }


@api_router.post("/admin/users/auto-inactivate")
async def auto_inactivate_inactive_users(
    current_user: User = Depends(get_current_admin)
):
    """
    Automatically mark customers as inactive if they haven't placed an order in 10+ days.
    Only affects customer role users.
    """
    ten_days_ago = datetime.utcnow() - timedelta(days=10)
    
    # Get all active customers
    active_customers = await db.users.find({
        "role": "customer",
        "is_active": True
    }).to_list(1000)
    
    inactivated_count = 0
    inactivated_users = []
    
    for customer in active_customers:
        customer_id = customer.get("id")
        
        # Check if customer has any orders in last 10 days
        recent_order = await db.orders.find_one({
            "$or": [
                {"user_id": customer_id},
                {"customer_id": customer_id}
            ],
            "created_at": {"$gte": ten_days_ago}
        })
        
        # If no recent orders, mark as inactive
        if not recent_order:
            await db.users.update_one(
                {"id": customer_id},
                {"$set": {"is_active": False}}
            )
            inactivated_count += 1
            inactivated_users.append({
                "username": customer.get("username"),
                "id": customer_id
            })
            logger.info(f"Auto-inactivated user {customer.get('username')} - no orders in 10+ days")
    
    return {
        "success": True,
        "message": f"Auto-inactivated {inactivated_count} customers with no orders in 10+ days",
        "inactivated_count": inactivated_count,
        "inactivated_users": inactivated_users[:20]  # Show first 20 for brevity
    }


# Wallet Management Routes
@api_router.get("/wallet", response_model=Wallet)
async def get_wallet(current_user: User = Depends(get_current_user)):
    """Get wallet balance for current user"""
    wallet = await db.wallets.find_one({"user_id": current_user.id})
    if not wallet:
        # Create wallet if it doesn't exist
        wallet_data = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "balance": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.wallets.insert_one(wallet_data)
        return Wallet(**wallet_data)
    
    return Wallet(**wallet)


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
                errors.append("Skipped: Cannot delete your own account")
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


# Product Whitelist Management Endpoints
@api_router.get("/admin/users/{user_id}/allowed-products")
async def get_user_allowed_products(
    user_id: str,
    current_user: User = Depends(get_current_admin)
):
    """
    Get the list of product IDs that a user is allowed to see/order.
    If allowed_product_ids is None or empty, user can see all products.
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    allowed_product_ids = user.get("allowed_product_ids", []) or []
    
    return {
        "user_id": user_id,
        "username": user.get("username"),
        "allowed_product_ids": allowed_product_ids,
        "has_restrictions": len(allowed_product_ids) > 0
    }


@api_router.put("/admin/users/{user_id}/allowed-products")
async def update_user_allowed_products(
    user_id: str,
    data: AllowedProductsUpdate,
    current_user: User = Depends(get_current_admin)
):
    """
    Update the list of product IDs that a user is allowed to see/order.
    Pass an empty array to remove all restrictions (user sees all products).
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent modifying admin users
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot set product restrictions for admin users")
    
    # Update user's allowed_product_ids
    # If empty array is passed, set to None to indicate "all products allowed"
    allowed_ids = data.product_ids if data.product_ids else None
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"allowed_product_ids": allowed_ids}}
    )
    
    logger.info(f"Admin {current_user.username} updated allowed products for user {user['username']}: {len(data.product_ids)} products")
    
    return {
        "message": "Allowed products updated successfully",
        "user_id": user_id,
        "username": user.get("username"),
        "allowed_product_ids": allowed_ids or [],
        "has_restrictions": allowed_ids is not None and len(allowed_ids) > 0
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
    
    # Set date range for the delivery date
    date_start = delivery_date.replace(hour=0, minute=0, second=0, microsecond=0)
    date_end = date_start + timedelta(days=1)
    
    # Get all orders with this delivery date, excluding cancelled
    orders = await db.orders.find({
        "delivery_date": {"$gte": date_start, "$lt": date_end},
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
async def get_preparation_list_report(
    date: str = None,
    current_user: User = Depends(get_current_admin)
):
    """Get preparation list report: Shows products with orders for today and/or tomorrow"""
    import pytz
    from datetime import datetime as dt
    from datetime import timedelta
    
    # Use IST timezone for date calculations
    ist = pytz.timezone('Asia/Kolkata')
    
    # Parse date or use today (in IST)
    if date:
        try:
            # Parse date string as IST date
            report_date = dt.strptime(date, "%Y-%m-%d")
            report_date = ist.localize(report_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        # Use current IST date
        now_ist = dt.now(ist)
        report_date = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get all products (exclude images for performance)
    products_cursor = db.products.find({}, {"image_base64": 0})
    products = await products_cursor.to_list(10000)
    
    # Set date ranges for today and tomorrow (in IST, then convert to UTC for DB query)
    today_start_ist = report_date.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_ist = today_start_ist + timedelta(days=1)
    tomorrow_start_ist = today_end_ist
    tomorrow_end_ist = tomorrow_start_ist + timedelta(days=1)
    
    # Convert to UTC for MongoDB query (MongoDB stores dates in UTC)
    today_start_utc = today_start_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    today_end_utc = today_end_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    tomorrow_start_utc = tomorrow_start_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    tomorrow_end_utc = tomorrow_end_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    
    logger.info(f"Preparation list for IST date: {report_date.date()}")
    logger.info(f"Today range (UTC): {today_start_utc} to {today_end_utc}")
    logger.info(f"Tomorrow range (UTC): {tomorrow_start_utc} to {tomorrow_end_utc}")
    
    # Get orders for today (both pending and confirmed, but not cancelled)
    # Also check for orders where delivery_date falls within today (handling timezone inconsistencies)
    orders_today_cursor = db.orders.find({
        "$or": [
            # Orders with delivery_date in today's range
            {"delivery_date": {"$gte": today_start_utc, "$lt": today_end_utc}},
            # Also catch orders stored with IST midnight (without timezone conversion)
            {"delivery_date": {"$gte": today_start_ist.replace(tzinfo=None), "$lt": today_end_ist.replace(tzinfo=None)}}
        ],
        "order_status": {"$nin": [OrderStatus.CANCELLED, "cancelled"]}
    })
    orders_today = await orders_today_cursor.to_list(10000)
    
    # Get orders for tomorrow
    orders_tomorrow_cursor = db.orders.find({
        "$or": [
            {"delivery_date": {"$gte": tomorrow_start_utc, "$lt": tomorrow_end_utc}},
            {"delivery_date": {"$gte": tomorrow_start_ist.replace(tzinfo=None), "$lt": tomorrow_end_ist.replace(tzinfo=None)}}
        ],
        "order_status": {"$nin": [OrderStatus.CANCELLED, "cancelled"]}
    })
    orders_tomorrow = await orders_tomorrow_cursor.to_list(10000)
    
    logger.info(f"Found {len(orders_today)} orders for today, {len(orders_tomorrow)} orders for tomorrow")
    
    # Calculate ordered quantities for today
    ordered_quantities_today = {}
    for order in orders_today:
        for item in order.get("items", []):
            product_id = item.get("product_id")
            quantity = item.get("quantity", 0)
            
            if product_id in ordered_quantities_today:
                ordered_quantities_today[product_id] += quantity
            else:
                ordered_quantities_today[product_id] = quantity
    
    # Calculate ordered quantities for tomorrow
    ordered_quantities_tomorrow = {}
    for order in orders_tomorrow:
        for item in order.get("items", []):
            product_id = item.get("product_id")
            quantity = item.get("quantity", 0)
            
            if product_id in ordered_quantities_tomorrow:
                ordered_quantities_tomorrow[product_id] += quantity
            else:
                ordered_quantities_tomorrow[product_id] = quantity
    
    # Get all product IDs that have orders (either today or tomorrow)
    all_product_ids = set(ordered_quantities_today.keys()) | set(ordered_quantities_tomorrow.keys())
    
    # Calculate preparation list
    preparation_list = []
    for product in products:
        product_id = product.get("id")
        
        # Skip products with no orders
        if product_id not in all_product_ids:
            continue
            
        product_name = product.get("name")
        
        # Use previous day's closing stock (stored in previous_closing_stock field)
        # If not available, fallback to current closing_stock
        previous_closing_stock = product.get("previous_closing_stock", product.get("closing_stock", 0))
        
        ordered_today = ordered_quantities_today.get(product_id, 0)
        ordered_tomorrow = ordered_quantities_tomorrow.get(product_id, 0)
        
        # New formula: Total = Orders for today + Orders for tomorrow - Last closing stock
        total = ordered_today + ordered_tomorrow - previous_closing_stock
        
        # Units to prepare is the total (if positive, need to prepare; if negative, have surplus)
        units_to_prepare = max(0, total)  # Only show positive values
        
        preparation_list.append({
            "product_id": product_id,
            "product_name": product_name,
            "previous_closing_stock": previous_closing_stock,
            "orders_today": ordered_today,
            "orders_tomorrow": ordered_tomorrow,
            "total": total,
            "units_to_prepare": units_to_prepare,
            "unit": product.get("unit", "piece")
        })
    
    # Sort by units_to_prepare (descending) so items needing most preparation appear first
    preparation_list.sort(key=lambda x: x["units_to_prepare"], reverse=True)
    
    return {
        "date": report_date.strftime("%Y-%m-%d"),
        "day_name": report_date.strftime("%A"),
        "total_items": len(preparation_list),
        "orders_today_count": len(orders_today),
        "orders_tomorrow_count": len(orders_tomorrow),
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


# Order Confirmation Messages Settings
@api_router.get("/admin/settings/order-messages")
async def get_order_confirmation_messages(current_user: User = Depends(get_current_admin)):
    """Get order confirmation messages for paid and pay later orders"""
    settings = await db.settings.find_one({"key": "order_confirmation_messages"})
    if not settings:
        return {
            "paid_order_message": "Thank you for your order! Your payment has been received and your order is being processed.",
            "pay_later_message": "Thank you for your order! Please make the payment upon delivery."
        }
    return {
        "paid_order_message": settings.get("paid_order_message", "Thank you for your order! Your payment has been received and your order is being processed."),
        "pay_later_message": settings.get("pay_later_message", "Thank you for your order! Please make the payment upon delivery.")
    }


@api_router.put("/admin/settings/order-messages")
async def update_order_confirmation_messages(
    paid_order_message: str,
    pay_later_message: str,
    current_user: User = Depends(get_current_admin)
):
    """Update order confirmation messages"""
    await db.settings.update_one(
        {"key": "order_confirmation_messages"},
        {"$set": {
            "paid_order_message": paid_order_message,
            "pay_later_message": pay_later_message
        }},
        upsert=True
    )
    return {
        "message": "Order confirmation messages updated",
        "paid_order_message": paid_order_message,
        "pay_later_message": pay_later_message
    }


# Pay Later Settings for Users
@api_router.get("/admin/users/{user_id}/pay-later")
async def get_user_pay_later_settings(
    user_id: str,
    current_user: User = Depends(get_current_admin)
):
    """Get pay later settings for a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user_id,
        "username": user.get("username"),
        "pay_later_enabled": user.get("pay_later_enabled", False),
        "pay_later_max_limit": user.get("pay_later_max_limit", 0)
    }


@api_router.put("/admin/users/{user_id}/pay-later")
async def update_user_pay_later_settings(
    user_id: str,
    pay_later_enabled: bool,
    pay_later_max_limit: float = 0,
    current_user: User = Depends(get_current_admin)
):
    """Update pay later settings for a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent enabling for admin users
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot enable pay later for admin users")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "pay_later_enabled": pay_later_enabled,
            "pay_later_max_limit": pay_later_max_limit if pay_later_enabled else 0
        }}
    )
    
    logger.info(f"Admin {current_user.username} updated pay later settings for user {user['username']}: enabled={pay_later_enabled}, limit={pay_later_max_limit}")
    
    return {
        "message": "Pay later settings updated",
        "user_id": user_id,
        "pay_later_enabled": pay_later_enabled,
        "pay_later_max_limit": pay_later_max_limit if pay_later_enabled else 0
    }


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

@api_router.get("/version")
async def version_check():
    import subprocess
    try:
        # Get current git commit hash
        commit_hash = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD']).decode('ascii').strip()
    except:
        commit_hash = "unknown"
    
    return {
        "version": "v3.0-payment-checkout-fix",
        "commit": commit_hash,
        "features": [
            "webhook_endpoint_enabled",
            "webhook_order_creation",
            "optional_customer_fields",
            "phone_normalization",
            "checkout_flow_fixed"
        ],
        "timestamp": "2025-11-28T09:00:00Z",
        "deployed_on_render": True
    }


# TEMPORARY: Setup endpoint to create first admin (remove after setup)
@api_router.get("/debug/users-raw")
async def debug_users_raw():
    """Debug endpoint to see raw user data - NO AUTH to avoid dependency issues"""
    try:
        users = await db.users.find().to_list(1000)  # Get ALL users
        # Convert ObjectId to string for JSON serialization
        for user in users:
            if "_id" in user:
                user["_id"] = str(user["_id"])
        return {"count": len(users), "users": users}
    except Exception as e:
        return {"error": str(e), "type": str(type(e))}


@api_router.post("/migrate-product-categories")
async def migrate_product_categories():
    """
    Migration endpoint to ensure all products have categories array.
    Converts single category field to categories array.
    """
    all_products = await db.products.find().to_list(1000)
    
    fixed_count = 0
    for product in all_products:
        updates = {}
        
        # If categories field is missing or empty
        if not product.get("categories") or len(product.get("categories", [])) == 0:
            # Use the category field to populate categories array
            if product.get("category"):
                updates["categories"] = [product["category"]]
            else:
                updates["categories"] = []
        
        if updates:
            result = await db.products.update_one(
                {"_id": product["_id"]},
                {"$set": updates}
            )
            if result.modified_count > 0:
                fixed_count += 1
    
    return {
        "message": f"Migrated {fixed_count} products to have categories array",
        "fixed": fixed_count
    }


@api_router.post("/migrate-user-types")
async def migrate_user_types():
    """
    Migration endpoint to set user_type for existing users.
    All existing users without user_type become 'owner'
    """
    all_users = await db.users.find().to_list(1000)
    
    fixed_count = 0
    for user in all_users:
        updates = {}
        
        if "user_type" not in user:
            updates["user_type"] = "owner"
        
        if "linked_owner_id" not in user:
            updates["linked_owner_id"] = None
        
        if updates:
            result = await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": updates}
            )
            if result.modified_count > 0:
                fixed_count += 1
    
    return {
        "message": f"Migrated {fixed_count} users to have user_type",
        "fixed": fixed_count
    }


@api_router.post("/fix-user-fields")
async def fix_user_fields():
    """
    Comprehensive migration to fix all missing/invalid required fields in users.
    Adds: id, is_approved, favorite_products, created_at, is_active
    Fixes: admin_access_level invalid values
    """
    all_users = await db.users.find().to_list(1000)
    
    fixed_count = 0
    details = []
    
    for user in all_users:
        updates = {}
        username = user.get("username", "unknown")
        
        # Check and add missing fields
        if "id" not in user:
            updates["id"] = str(uuid.uuid4())
        
        if "is_approved" not in user:
            updates["is_approved"] = True
        
        if "favorite_products" not in user:
            updates["favorite_products"] = []
        
        if "created_at" not in user:
            updates["created_at"] = datetime.utcnow()
        
        if "is_active" not in user:
            updates["is_active"] = True
        
        # Fix invalid admin_access_level values
        if "admin_access_level" in user:
            access_level = user["admin_access_level"]
            # Map invalid values to valid ones
            if access_level not in ["full", "limited", "reports"]:
                if access_level in ["superadmin", "admin"]:
                    updates["admin_access_level"] = "full"
                elif access_level == "none":
                    # For customers, remove this field (not needed)
                    if user.get("role") == "customer":
                        updates["admin_access_level"] = "full"  # Default for safety
                else:
                    updates["admin_access_level"] = "full"  # Default fallback
        
        # Apply updates if any
        if updates:
            result = await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": updates}
            )
            if result.modified_count > 0:
                fixed_count += 1
                details.append(f"{username}: fixed {list(updates.keys())}")
    
    return {
        "message": f"Fixed {fixed_count} users with missing/invalid fields",
        "fixed": fixed_count,
        "details": details[:15]  # Show first 15 for brevity
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


# Setup Standing Orders routes BEFORE including the router
from standing_orders_routes import setup_standing_orders_routes
setup_standing_orders_routes(api_router, db, get_current_admin)

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
