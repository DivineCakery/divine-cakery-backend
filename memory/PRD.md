# Divine Cakery - Product Requirements Document

## Original Problem Statement
Build and maintain a wholesale bakery management system (Divine Cakery) with:
- Customer ordering & wallet system
- Admin dashboard with product/order/user management
- Staff checklist feature with daily reports across 7 departments
- WhatsApp-based report sending
- Razorpay payments integration
- Standing orders (recurring)
- Android app via Expo/React Native

## Tech Stack
- **Frontend**: Expo (React Native) with TypeScript
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **Hosting**: Render.com (production backend)
- **Build**: EAS (Android builds)
- **Payments**: Razorpay

## Staff Checklist Feature (Complete)
### Report Sections (7 total)
1. Top Room, 2. Dough Section, 3. Packing Section, 4. Angels/Prep Section,
5. Cleaning/Facilities Team, 6. Supervisor, 7. Sales Team

### Key Features
- **Independent staff lists per section** — each section has its own staff
- **Editable checklist items** — admin can add/edit/remove numbered tasks per section
- **Dynamic report generation** — checklist items fetched from backend
- **WhatsApp dual-send** — reports sent to both Divine Office and Soman Nair
- **Daily/Weekly task lists** — editable per section

### API Endpoints
- `GET/PUT /api/admin/section-tasks/{section_key}` — daily_tasks, weekly_tasks, checklist_items
- `GET/POST/DELETE /api/admin/section-staff/{section_key}` — independent staff per section
- Valid sections: top_room, dough_section, packing_section, angels_prep, cleaning_facilities, supervisor, sales_team

## Payment Flow (Fixed)
### OTP Issue Fix
- **Problem**: In-app browser (Chrome Custom Tabs) closed when user minimized app to check OTP, aborting payment
- **Fix**: Replaced `expo-web-browser` with `Linking.openURL` (opens in device's actual browser which persists through app switches)
- **wallet.tsx**: Opens payment in external browser + AppState listener detects return → refreshes balance
- **checkout.tsx**: Opens payment in external browser + AppState listener detects return → polls transaction status (15 attempts x 2s)
- **Backend**: Zero changes — callback URL and payment processing unchanged

## Key Files
### Backend
- `backend/server.py` — All endpoints

### Frontend - Payment
- `app/(customer)/wallet.tsx` — Wallet top-up with external browser payment
- `app/(customer)/checkout.tsx` — Checkout with external browser UPI payment

### Frontend - Admin Reports
- `app/(admin)/dashboard.tsx` — Collapsible "Daily Reports" section
- `app/(admin)/{section}-report.tsx` — 7 report pages
- `app/(admin)/{section}-tasks.tsx` — 7 tasks pages
- `services/api.ts` — All API methods

## Known Issues
- **P0 BLOCKED**: Production backend on Render.com is out-of-date. User must push to `divine-cakery-backend` GitHub repo.

## Credentials (Dev)
- Admin: username=Soman, password=Soman@123
