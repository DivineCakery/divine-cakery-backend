<<<<<<< HEAD
# Divine Cakery - Wholesale Bakery Mobile App

A comprehensive native mobile application built with Expo (React Native) for Divine Cakery's wholesale bakery business in Kerala, India.

## 🏪 Business Information

**Divine Cakery**
- Location: BNRA 161, Bhagawathi Nagar, NCC Road, Thiruvananthapuram, Kerala
- Website: www.divinecakery.in
- Type: Wholesale Bakery Products

## ✨ Features

### Customer Features
✅ User Authentication (Login/Register)
✅ Product Browsing by Category  
✅ Shopping Cart Management
✅ Wallet System with UPI Integration (ready)
✅ Order Placement & History
✅ User Profile Management

### Admin Features  
✅ Dashboard with Statistics
✅ Product Management (CRUD)
✅ Order Management
✅ User Management
✅ Admin Profile

### Payment Integration
⏳ Razorpay UPI Integration (awaiting credentials)
✅ Wallet-based Payments
✅ Mock Payment Flow for Development

## 🛠️ Tech Stack

- **Frontend**: Expo v54 (React Native), Zustand, Axios, Expo Router
- **Backend**: FastAPI (Python), JWT Auth, Razorpay SDK
- **Database**: MongoDB
- **Deployment**: Kubernetes, Nginx

## 🔑 Default Credentials

**Admin**: username: `admin` | password: `admin123`

## 🚀 Quick Start

1. **Services**: Backend and Expo are already running
2. **Access**: https://prep-route-admin.preview.emergentagent.com
3. **Scan QR**: Use Expo Go app on mobile to scan QR code

## 📦 Sample Data

10 bakery products already loaded including breads, cakes, muffins, brownies, cookies, and donuts.

## 💰 Adding Razorpay (Optional)

To enable real UPI payments, update `/app/backend/.env`:
```env
RAZORPAY_KEY_ID="rzp_test_xxxxx"
RAZORPAY_KEY_SECRET="xxxxx"
```

Then restart: `sudo supervisorctl restart backend`

## 📱 App Structure

```
/app/
├── backend/          # FastAPI server
├── frontend/         # Expo mobile app
│   └── app/
│       ├── (auth)/        # Login, Register
│       ├── (customer)/    # Products, Cart, Wallet, Orders
│       └── (admin)/       # Dashboard, Management
├── services/         # API service layer
└── store/           # Zustand state management
```

## 🔐 Security

- JWT authentication
- Bcrypt password hashing
- Protected routes
- Role-based access control

---

**Built for Divine Cakery | Powered by Emergent**
=======
# Divine Cakery Backend API

FastAPI backend for Divine Cakery wholesale bakery mobile application.

## Features
- User authentication (Admin, Customer, Order Agent roles)
- Product management with categories
- Order management with delivery scheduling
- Standing orders with auto-generation
- Wallet and payment management
- Razorpay integration
- WhatsApp notifications
- Admin reports and analytics

## Tech Stack
- FastAPI
- MongoDB (Motor async driver)
- Python 3.11
- JWT authentication
- Razorpay payment gateway

## Deployment
This backend is deployed on Render.com with MongoDB Atlas.

## Environment Variables
Required environment variables:
- MONGO_URL
- DB_NAME
- SECRET_KEY
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- SMTP_SERVER
- SMTP_PORT
- SMTP_USERNAME
- SMTP_PASSWORD
- ADMIN_EMAIL

## API Documentation
Visit `/docs` endpoint for Swagger documentation.
>>>>>>> bef83fd1bbcd3946556e9508ea19b61d751e540a
