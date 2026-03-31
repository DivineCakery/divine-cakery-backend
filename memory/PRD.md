# Divine Cakery - Product Requirements Document

## Original Problem Statement
Wholesale bakery management system with customer ordering, wallet system, admin dashboard, staff checklist reports, WhatsApp report sending, Razorpay payments, standing orders, and Android app via Expo/React Native.

## Tech Stack
- Frontend: Expo (React Native) with TypeScript
- Backend: FastAPI (Python), Database: MongoDB Atlas
- Hosting: Render.com (production), Build: EAS (Android)

## CRITICAL: Production Backend Deploy Needed
The following features require deploying updated `server.py` and `models.py` to Render.com:
- Route Codes management
- Route Summaries report
- WhatsApp numbers management
- Admin delete by super admin

## Completed Features

### Admin Place Order & Record Payment - COMPLETE (2026-03-31)
- Admin can place pay-later orders on behalf of any customer
- Orders tagged with `is_pay_later: true`, `placed_by_admin: true`, `payment_status: pending`
- Same product catalog as customers, auto next delivery date, notes field
- Admin can record payments against customer's pending balance
- Payment settles oldest pending orders first (FIFO)
- Customer balance view shows pending amount + recent payments
- APIs: `POST /api/admin/place-order`, `POST /api/admin/record-payment`, `GET /api/admin/customer-balance/{id}`
- Backend: 11/11 tests passed, Frontend: UI verified

### Route Summaries Report v2 - COMPLETE (2026-03-30)
- 7-point layout rework completed and tested:
  1. Separate driver inputs per route sub-code (SR1/SR2, LR1/LR2, LFT, ONS)
  2. Doubled font sizes in PDF (body 18px, headers 28px, table 16px)
  3. SR1/SR2 and LR1/LR2 split into distinct grouped sections with Total columns BEFORE customer columns
  4. Total columns for all routes (Onsite ONS Total, Lulu LFT Total)
  5. 'LFT' label for Lulu (not LULU1)
  6. Black & white PDF theme (no colored backgrounds)
  7. Date picker with prev/next day navigation
- Matrix/pivot table: items (rows) x customers (columns) with quantities
- API: `GET /api/admin/reports/route-summary?route_type=&date=`

### Route Codes Management - COMPLETE (2026-03-30)
- Manage Route Codes page: CRUD for route codes (code + label)
- Route Code dropdown in customer form (required field)
- Route code displayed on user cards in Manage Users
- API: CRUD `/api/admin/route-codes`

### Preparation Report - COMPLETE
- 3-tab Reports: Daily Items, Prep List, Prep Report
- Department/Reported by dropdowns, adjusted Today/Tmrw values
- Print/Share PDF with Limited/Full view options
- Burger Dough filtering (5 items -> Top Room)
- WhatsApp numbers management (add/delete)

### Staff Checklist (7 Sections) - COMPLETE
### Razorpay OTP Payment Fix - COMPLETE
### Dashboard Access Control - COMPLETE
### Admin Delete by Super Admin - COMPLETE

## Key Files
- `frontend/app/(admin)/route-summaries.tsx` - Route Summaries page (v2 rework)
- `frontend/app/(admin)/manage-route-codes.tsx` - Route Codes CRUD
- `frontend/app/(admin)/reports.tsx` - Reports (3 tabs)
- `frontend/app/(admin)/customer-form.tsx` - Customer form with route code
- `frontend/app/(admin)/dashboard.tsx` - Dashboard
- `frontend/services/api.ts` - API service layer (fixed URL priority: .env > app.json)
- `backend/server.py` - All backend endpoints
- `backend/models.py` - Data models

## API Priority Fix
- `api.ts` URL priority changed: `.env` (EXPO_PUBLIC_BACKEND_URL) takes precedence over `app.json` extra config
- This allows preview environment to work correctly while production builds still use app.json

## Backlog
- P1: New production Android build (.aab) after backend deployment
- P2: Refactor `reports.tsx` (~1700 lines) into smaller components
- P2: Report History feature (snapshot daily reports to DB)
- P3: Copy Staff List feature between sections

## Login Bug Fix (2026-03-30)
- Database user schema had migrated (password_hash SHA-256 → hashed_password bcrypt needed)
- Fixed `Soman` admin user: added bcrypt hashed_password, set role=admin, admin_access_level=full
- Added all required User model fields (wallet_balance, favorite_products, etc.)
- Made login case-insensitive in preview backend (regex match)
- Verified login works on BOTH production Render and preview backends

## Credentials (Dev)
- Admin: username=Soman, password=Soman@123
- Other staff users (bindu, supervisor1, accounts1, sales1, kitchen1) need password reset - they have old SHA-256 hashes
