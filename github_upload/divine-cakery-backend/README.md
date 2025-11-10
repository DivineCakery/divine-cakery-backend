# Divine Cakery Backend

FastAPI backend for The Divine Cakery wholesale bakery application.

## Features

- **User Management**: Customer and admin authentication with JWT
- **Product Management**: Multi-category product support with stock tracking
- **Order System**: Order processing with delivery tracking
- **Standing Orders**: Automatic recurring order generation
- **Reports**: Daily preparation lists and sales analytics
- **Payment Integration**: Razorpay payment gateway (test mode)
- **Wallet System**: Customer credit management

## Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB (MongoDB Atlas)
- **Authentication**: JWT with passlib
- **Payment**: Razorpay
- **Image Processing**: Pillow
- **Email**: SMTP (Outlook)

## Setup

### 1. Clone Repository
```bash
git clone https://github.com/YourUsername/divine-cakery-backend.git
cd divine-cakery-backend
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `MONGO_URL`: MongoDB Atlas connection string
- `DB_NAME`: Database name (default: divine_cakery)
- `SECRET_KEY`: JWT secret key
- `RAZORPAY_KEY_ID`: Razorpay API key
- `RAZORPAY_KEY_SECRET`: Razorpay secret key
- `SMTP_SERVER`: Email server (default: smtp-mail.outlook.com)
- `SMTP_PORT`: Email port (default: 587)
- `SMTP_USERNAME`: Email username
- `SMTP_PASSWORD`: Email password
- `ADMIN_EMAIL`: Admin email address

### 4. Run Locally
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

API will be available at: `http://localhost:8001`

### 5. API Documentation
Once running, visit:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Deployment

### Render.com

This project is configured for Render.com deployment with `render.yaml`.

**Steps:**
1. Push code to GitHub
2. Connect Render to your GitHub repository
3. Render will automatically detect `render.yaml`
4. Add environment variables in Render dashboard
5. Deploy!

## Scripts

- `create_demo_admins.py`: Create demo admin users
- `bulk_upload_products.py`: Bulk product import from Excel
- `optimize_product_images.py`: Compress large product images
- `migrate_to_atlas.py`: Migrate local MongoDB to Atlas

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register new user
- `POST /api/auth/login`: Login user
- `GET /api/auth/me`: Get current user

### Products
- `GET /api/products`: List all products
- `POST /api/products`: Create product (admin)
- `PUT /api/products/{id}`: Update product (admin)
- `DELETE /api/products/{id}`: Delete product (admin)

### Orders
- `POST /api/orders`: Create order
- `GET /api/orders`: List orders
- `PUT /api/orders/{id}`: Update order

### Admin
- `GET /api/admin/stats`: Dashboard statistics
- `GET /api/admin/reports/daily-items`: Daily preparation report
- `GET /api/admin/users`: List all users
- `GET /api/admin/pending-users`: Pending approvals

## Database Schema

See `models.py` for Pydantic models.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

Private - The Divine Cakery

## Contact

For issues or questions, contact: somann2@hotmail.com
