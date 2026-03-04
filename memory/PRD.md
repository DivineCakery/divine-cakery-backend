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
- **Independent staff lists per section** — each section has its own staff (different workers in different areas)
- **Editable checklist items** — admin can add/edit/remove numbered tasks (1-4+) per section via Tasks page
- **Dynamic report generation** — report pages fetch checklist items from backend, not hardcoded
- **WhatsApp dual-send** — reports sent to both Divine Office and Soman Nair
- **Daily/Weekly task lists** — editable per section
- **Shared UI pattern** — all 7 sections follow same structure, each with own data

### API Endpoints
- `GET/PUT /api/admin/section-tasks/{section_key}` — daily_tasks, weekly_tasks, checklist_items
- `GET/POST/DELETE /api/admin/section-staff/{section_key}` — independent staff per section
- `GET/PUT /api/admin/cleaning-tasks` — Original Top Room tasks (backward compat)
- `GET/POST/DELETE /api/admin/staff-list` — Original shared staff (backward compat)

### Valid Section Keys
top_room, dough_section, packing_section, angels_prep, cleaning_facilities, supervisor, sales_team

### DB Collections
- `section_tasks` — stores daily_tasks, weekly_tasks, checklist_items per section
- `section_staff` — stores independent staff members per section

## Key Files
### Backend
- `backend/server.py` — All endpoints including section-tasks and section-staff

### Frontend
- `app/(admin)/dashboard.tsx` — Collapsible "Daily Reports" section
- `app/(admin)/_layout.tsx` — Tab navigation with hidden report pages
- `app/(admin)/{section}-report.tsx` — 7 report pages (top-room, dough-section, packing-section, angels-prep, cleaning-facilities, supervisor, sales-team)
- `app/(admin)/{section}-tasks.tsx` — 7 tasks pages (cleaning-tasks for top-room, plus 6 others)
- `services/api.ts` — All API methods including getSectionStaff/Tasks, addSectionStaff, etc.

## Known Issues
- **P0 BLOCKED**: Production backend on Render.com is out-of-date. User must push to `divine-cakery-backend` GitHub repo.

## Credentials (Dev)
- Admin: username=Soman, password=Soman@123
