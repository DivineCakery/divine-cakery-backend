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

## Core Features (Implemented)
- User auth (login, register, admin approval flow)
- Product management with categories, images, stock
- Order management (create, view, status updates)
- Wallet system with Razorpay top-up
- Standing/recurring orders
- Admin dashboard with stats
- Staff checklist - 7 report sections (Top Room + 6 new)
- Cleaning task management per section (editable)
- WhatsApp report sending (dual numbers)
- Forgot password (admin-assisted via WhatsApp)
- Remember Me login feature
- Delivery date calculation (IST-based)
- Email notifications for new registrations

## Staff Checklist Feature (Complete)
### Report Sections (7 total)
1. **Top Room** - `/api/admin/cleaning-tasks` (original, uses `cleaning_tasks` collection)
2. **Dough Section** - `/api/admin/section-tasks/dough_section`
3. **Packing Section** - `/api/admin/section-tasks/packing_section`
4. **Angels/Prep Section** - `/api/admin/section-tasks/angels_prep`
5. **Cleaning/Facilities Team** - `/api/admin/section-tasks/cleaning_facilities`
6. **Supervisor** - `/api/admin/section-tasks/supervisor`
7. **Sales Team** - `/api/admin/section-tasks/sales_team`

### Each Report Section Has:
- Report page: staff dropdown (filled by, worked, absent), 4-item checklist, WhatsApp submit
- Tasks page: editable daily tasks list + weekly tasks (Mon-Sun), admin edit/save
- Shared staff list across all sections
- Same WhatsApp numbers (Divine Office + Soman Nair)

### API Endpoints
- `GET/PUT /api/admin/section-tasks/{section_key}` - Generic for 6 new sections
- `GET/PUT /api/admin/cleaning-tasks` - Original Top Room tasks
- `GET/POST/DELETE /api/admin/staff-list` - Shared staff management

## Key Files
### Backend
- `backend/server.py` - Main API (all endpoints including section-tasks)
- `backend/models.py` - Pydantic models

### Frontend - Admin Section
- `app/(admin)/dashboard.tsx` - Collapsible "Daily Reports" section
- `app/(admin)/_layout.tsx` - Tab navigation with hidden report pages
- `app/(admin)/top-room-report.tsx` - Original report template
- `app/(admin)/cleaning-tasks.tsx` - Original tasks template
- `app/(admin)/dough-section-report.tsx` + `dough-section-tasks.tsx`
- `app/(admin)/packing-section-report.tsx` + `packing-section-tasks.tsx`
- `app/(admin)/angels-prep-report.tsx` + `angels-prep-tasks.tsx`
- `app/(admin)/cleaning-facilities-report.tsx` + `cleaning-facilities-tasks.tsx`
- `app/(admin)/supervisor-report.tsx` + `supervisor-tasks.tsx`
- `app/(admin)/sales-team-report.tsx` + `sales-team-tasks.tsx`
- `services/api.ts` - API service with getSectionTasks/updateSectionTasks

## Known Issues
- **P0 BLOCKED**: Production backend on Render.com is out-of-date. User must push backend code to `divine-cakery-backend` GitHub repo (main branch) to deploy.

## Backlog
- None currently. All requested features implemented.

## Credentials (Dev)
- Admin: username=Soman, password=Demo
