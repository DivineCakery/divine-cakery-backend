from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"


class AdminAccessLevel(str, Enum):
    FULL = "full"  # Full access to everything
    LIMITED = "limited"  # Dashboard and orders only
    REPORTS = "reports"  # Dashboard and reports only


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class TransactionType(str, Enum):
    WALLET_TOPUP = "wallet_topup"
    ORDER_PAYMENT = "order_payment"
    REFUND = "refund"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


# Category Models
class CategoryType(str, Enum):
    PRODUCT_CATEGORY = "product_category"
    DOUGH_TYPE = "dough_type"

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0
    is_admin_only: bool = False  # True for categories only visible to admins
    category_type: CategoryType = CategoryType.PRODUCT_CATEGORY  # Distinguish between product categories and dough types

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_admin_only: Optional[bool] = None
    category_type: Optional[CategoryType] = None

class Category(CategoryBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# User Models
class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    business_name: Optional[str] = None
    address: Optional[str] = None
    can_topup_wallet: bool = True
    onsite_pickup_only: bool = False
    delivery_charge_waived: bool = False
    admin_access_level: Optional[AdminAccessLevel] = AdminAccessLevel.FULL
    user_type: str = "owner"  # "owner" or "order_agent"
    linked_owner_id: Optional[str] = None  # For order agents, reference to owner user ID
    allowed_product_ids: Optional[List[str]] = None  # Product whitelist - None/empty means all products allowed
    pay_later_enabled: bool = False  # Admin enables this per user
    pay_later_max_limit: float = 0  # Maximum order value for Pay Later


class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    business_name: Optional[str] = None
    address: Optional[str] = None
    can_topup_wallet: bool = True
    onsite_pickup_only: bool = False
    delivery_charge_waived: bool = False
    admin_access_level: Optional[AdminAccessLevel] = AdminAccessLevel.FULL
    user_type: str = "owner"
    linked_owner_id: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class User(UserBase):
    id: str
    wallet_balance: float = 0.0
    created_at: datetime
    is_active: bool = True
    favorite_products: List[str] = []
    is_approved: bool = True  # True by default for backward compatibility


class UserInDB(User):
    hashed_password: str


# Product Models
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str  # Keep for backward compatibility
    categories: List[str] = []  # New field for multiple categories
    dough_type_id: Optional[str] = None  # Reference to dough type category
    mrp: float
    price: float
    packet_size: Optional[str] = None
    unit: str = "piece"  # piece, kg, dozen, etc.
    remarks: Optional[str] = None
    image_base64: Optional[str] = None
    is_available: bool = True
    closing_stock: int = 0  # Inventory count
    shelf_life: Optional[str] = None  # e.g., "3-5 days", "1 week"
    storage_instructions: Optional[str] = None  # e.g., "Store in cool, dry place"
    food_type: Optional[str] = "veg"  # "veg" or "non-veg" (FSSAI compliance)
    ingredients: Optional[str] = None  # List of ingredients
    allergen_info: Optional[str] = None  # Allergen information


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    categories: Optional[List[str]] = None  # MISSING FIELD - Added for multi-category support
    dough_type_id: Optional[str] = None  # Reference to dough type category
    mrp: Optional[float] = None
    price: Optional[float] = None
    packet_size: Optional[str] = None
    unit: Optional[str] = None
    remarks: Optional[str] = None
    image_base64: Optional[str] = None
    is_available: Optional[bool] = None
    closing_stock: Optional[int] = None
    shelf_life: Optional[str] = None
    storage_instructions: Optional[str] = None
    food_type: Optional[str] = None
    ingredients: Optional[str] = None
    allergen_info: Optional[str] = None


class Product(ProductBase):
    id: str
    created_at: datetime
    updated_at: datetime


# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float
    subtotal: float


class OrderCreate(BaseModel):
    items: List[OrderItem]
    subtotal: float
    delivery_charge: float = 0.0
    discount_amount: float = 0.0
    total_amount: float
    payment_method: str  # wallet or upi
    order_type: str = "delivery"  # "delivery" or "pickup"
    delivery_address: Optional[str] = None
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    order_status: Optional[OrderStatus] = None
    payment_status: Optional[str] = None
    delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: Optional[List[OrderItem]] = None
    total_amount: Optional[float] = None
    final_amount: Optional[float] = None


class Order(BaseModel):
    id: str
    user_id: str
    items: List[OrderItem]
    subtotal: Optional[float] = None  # Optional for backward compatibility
    delivery_charge: float = 0.0
    discount_amount: float = 0.0
    total_amount: float
    payment_method: str
    payment_status: str = "pending"
    order_status: OrderStatus = OrderStatus.PENDING
    order_type: str = "delivery"  # "delivery" or "pickup"
    delivery_address: Optional[str] = None
    delivery_date: Optional[datetime] = None  # Actual delivery date (can be edited by admin)
    notes: Optional[str] = None
    standing_order_id: Optional[str] = None  # ID of the standing order that generated this order
    is_standing_order: Optional[bool] = False  # Whether this order was auto-generated from a standing order
    created_at: datetime
    updated_at: datetime


# Discount Models
class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class Discount(BaseModel):
    id: str
    customer_id: str
    discount_type: DiscountType
    discount_value: float  # Percentage (0-100) or fixed amount
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class DiscountCreate(BaseModel):
    customer_id: str
    discount_type: DiscountType
    discount_value: float
    start_date: datetime
    end_date: datetime


class DiscountUpdate(BaseModel):
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


# Wallet Models
class Wallet(BaseModel):
    user_id: str
    balance: float = 0.0
    updated_at: datetime


# Transaction Models
class TransactionCreate(BaseModel):
    amount: float
    transaction_type: TransactionType
    payment_method: str = "upi"
    notes: Optional[dict] = None


class Transaction(BaseModel):
    id: str
    user_id: str
    amount: float
    transaction_type: TransactionType
    payment_method: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    status: TransactionStatus = TransactionStatus.PENDING
    notes: Optional[dict] = None
    created_at: datetime


# Payment Models
class PaymentOrderCreate(BaseModel):
    amount: float
    transaction_type: TransactionType = TransactionType.WALLET_TOPUP
    notes: Optional[dict] = None


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# Token Model
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None


# Response Models
class MessageResponse(BaseModel):
    message: str


class WalletResponse(BaseModel):
    balance: float
    updated_at: datetime



# Standing Order Models
class RecurrenceType(str, Enum):
    WEEKLY_DAYS = "weekly_days"  # Based on specific days of week
    INTERVAL = "interval"  # Based on day intervals (every N days)


class DurationType(str, Enum):
    END_DATE = "end_date"  # Has a specific end date
    INDEFINITE = "indefinite"  # Runs indefinitely


class StandingOrderStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"


# Password Reset Models
class PasswordResetRequest(BaseModel):
    identifier: str  # Can be username or phone number

class PasswordResetVerifyOTP(BaseModel):
    identifier: str  # username or phone
    otp: str

class PasswordResetComplete(BaseModel):
    reset_token: str
    new_password: str


# App Version Model
class AppVersionInfo(BaseModel):
    latest_version: str
    latest_version_code: int
    release_date: str  # ISO format date
    update_message: Optional[str] = "A new version is available with improvements and bug fixes."
    minimum_supported_version: Optional[str] = None  # For force updates (version string)
    minimum_supported_version_code: Optional[int] = None  # For force updates (version code)



class StandingOrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float


class StandingOrderCreate(BaseModel):
    customer_id: str
    items: List[StandingOrderItem]
    recurrence_type: RecurrenceType
    recurrence_config: dict  # For weekly_days: {"days": [0,2,4]} (Mon=0, Sun=6), For interval: {"days": 2}
    duration_type: DurationType
    end_date: Optional[datetime] = None
    notes: Optional[str] = None


class StandingOrderUpdate(BaseModel):
    items: Optional[List[StandingOrderItem]] = None
    recurrence_type: Optional[RecurrenceType] = None
    recurrence_config: Optional[dict] = None
    duration_type: Optional[DurationType] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[StandingOrderStatus] = None


class StandingOrder(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    items: List[StandingOrderItem]
    recurrence_type: RecurrenceType
    recurrence_config: dict
    duration_type: DurationType
    end_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: StandingOrderStatus = StandingOrderStatus.ACTIVE
    created_at: datetime
    created_by: str  # Admin username who created it
    next_delivery_date: Optional[datetime] = None  # Next scheduled delivery


# Stock Reset Event Models
class StockResetEvent(BaseModel):
    id: str
    reset_date: datetime
    reset_by: str  # Username of admin who performed reset
    products_count: int  # Number of products reset
    notes: Optional[str] = None
    
class StockResetEventCreate(BaseModel):
    notes: Optional[str] = None


# Product Whitelist Model
class AllowedProductsUpdate(BaseModel):
    product_ids: List[str]

