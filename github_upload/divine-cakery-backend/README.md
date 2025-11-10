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
