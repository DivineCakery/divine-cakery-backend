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
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0
    is_admin_only: bool = False  # True for categories only visible to admins

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_admin_only: Optional[bool] = None

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
