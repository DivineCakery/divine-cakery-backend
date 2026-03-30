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

### Route Summaries Report - COMPLETE (2026-03-30)
- New "Route Summaries" page linked from dashboard
- 4 route types: Lulu Trip (LULU1), Short Route (SR1, SR2), Long Route (LR1, LR2), Onsite (ONS)
- Matrix/pivot table: items (rows) x customers (columns) with quantities
- Date picker with prev/next arrows
- Driver name text input
- Print/Save PDF in landscape A4 format with rotated customer headers
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
- Burger Dough filtering (5 items → Top Room)
- WhatsApp numbers management (add/delete)

### Staff Checklist (7 Sections) - COMPLETE
### Razorpay OTP Payment Fix - COMPLETE
### Dashboard Access Control - COMPLETE
### Admin Delete by Super Admin - COMPLETE

## Key Files
- `frontend/app/(admin)/route-summaries.tsx` - Route Summaries page
- `frontend/app/(admin)/manage-route-codes.tsx` - Route Codes CRUD
- `frontend/app/(admin)/reports.tsx` - Reports (3 tabs)
- `frontend/app/(admin)/customer-form.tsx` - Customer form with route code
- `frontend/app/(admin)/dashboard.tsx` - Dashboard
- `frontend/services/api.ts` - API service layer
- `backend/server.py` - All backend endpoints
- `backend/models.py` - Data models

## Backlog
- P2: Refactor `reports.tsx` into smaller components
- P2: Report History feature
- P3: Copy Staff List feature

## Credentials (Dev)
- Admin: username=Soman, password=Soman@123
