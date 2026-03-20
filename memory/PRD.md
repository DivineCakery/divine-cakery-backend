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
- **Independent staff lists per section** - each section has its own staff
- **Editable checklist items** - admin can add/edit/remove numbered tasks per section
- **Dynamic report generation** - checklist items fetched from backend
- **WhatsApp dual-send** - reports sent to both Divine Office and Soman Nair
- **Daily/Weekly task lists** - editable per section

### API Endpoints
- `GET/PUT /api/admin/section-tasks/{section_key}` - daily_tasks, weekly_tasks, checklist_items
- `GET/POST/DELETE /api/admin/section-staff/{section_key}` - independent staff per section
- Valid sections: top_room, dough_section, packing_section, angels_prep, cleaning_facilities, supervisor, sales_team

## Payment Flow (Fixed)
### OTP Issue Fix
- **Problem**: In-app browser closed when user minimized app to check OTP
- **Fix**: Replaced `expo-web-browser` with `Linking.openURL` + manual confirmation modal
- **wallet.tsx**: Opens payment in external browser + AppState listener
- **checkout.tsx**: Same pattern + polls transaction status

## Preparation Report Feature (Complete - Fixed 2026-03-20)
### Overview
- New "Prep Report" tab added to Reports screen
- Department-based filtering (Dough Section, Top Room, Angels Section)
- Staff-based "Reported by" selection
- Table with Today/Tomorrow/Prepared/Not Done columns
- Special Burger Dough item filtering for Top Room

### Bug Fixes Applied (2026-03-20)
- Fixed dropdown modals using wrong style name (`dropdownContainer` -> `dropdownContent`)
- Added `onStartShouldSetResponder` for proper touch handling in modals
- Added missing styles: `prepActionRow`, `printButton`, `printButtonText`, `pdfButton`, `pdfButtonText`

### Features
- Print report (via expo-print)
- Share as PDF (via expo-print + expo-sharing)
- Send via WhatsApp with formatted text

## Key Files
### Backend
- `backend/server.py` - All endpoints

### Frontend - Payment
- `app/(customer)/wallet.tsx` - Wallet top-up
- `app/(customer)/checkout.tsx` - Checkout payment

### Frontend - Admin Reports
- `app/(admin)/reports.tsx` - Reports screen with 3 tabs (Daily Items, Prep List, Prep Report)
- `app/(admin)/dashboard.tsx` - Admin dashboard
- `app/(admin)/{section}-report.tsx` - 7 report pages
- `app/(admin)/{section}-tasks.tsx` - 7 tasks pages
- `services/api.ts` - All API methods

## Known Issues
- **TOP_ROOM_BURGER_ITEMS filter**: The product names in the filter list may not exactly match actual database product names (e.g., "hot hotdog buns" vs "HOT HOTDOG BUN*4"). Needs verification with real data.

## Backlog / Future Tasks
- **P1**: Verify Burger Dough special filtering with actual product data
- **P2**: Refactor `reports.tsx` (1600+ lines) into smaller components
- **P2**: Add "Report History" feature to save completed reports to DB
- **P3**: Add "Copy Staff List" feature between sections

## Credentials (Dev)
- Admin: username=Soman, password=Soman@123
