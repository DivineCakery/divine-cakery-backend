# Divine Cakery - Product Requirements Document

## Original Problem Statement
Wholesale bakery management system with customer ordering, wallet system, admin dashboard, staff checklist reports, WhatsApp report sending, Razorpay payments, standing orders, and Android app via Expo/React Native.

## Tech Stack
- Frontend: Expo (React Native) with TypeScript
- Backend: FastAPI (Python)
- Database: MongoDB Atlas
- Hosting: Render.com (production backend)
- Build: EAS (Android builds)
- Payments: Razorpay

## Completed Features

### Staff Checklist (7 Sections) - COMPLETE
- Independent staff lists and editable checklists per section
- WhatsApp dual-send reports
- API: `/api/admin/section-staff/{key}`, `/api/admin/section-tasks/{key}`

### Razorpay OTP Payment Fix - COMPLETE
- External browser + manual confirmation modal for OTP flows

### Preparation Report - COMPLETE
- 3-tab Reports screen: Daily Items, Prep List, Prep Report
- Department dropdown (Dough Section, Top Room, Angels Section)
- Reported by dropdown (staff per department)
- Table with adjusted Today/Tmrw values (closing stock subtracted)
- Special Burger Dough filtering: 5 items moved to Top Room
- Print/Share PDF with Limited View (no Prepared/Not Done) and Full View options
- Multi-page printing via hidden iframe (web) / expo-print (native)
- Date on PDF header line
- Items with 0 adjusted values filtered out

### WhatsApp Numbers Management - COMPLETE (needs production deploy)
- Dynamic add/delete WhatsApp numbers
- Stored in `app_settings` collection
- Default numbers: Divine Office, Soman Nair
- API: `/api/admin/whatsapp-numbers`, `/api/admin/whatsapp-numbers/add`, `/api/admin/whatsapp-numbers/{id}`

### Dashboard Access Control - COMPLETE
- Daily Reports section hidden for non-full-access admins

### Burger Dough Filtering - COMPLETE
- 5 items moved from Dough Section to Top Room: HOT HOTDOG BUN*4, LUL SAMOON SEEDED*4, Hotdog buns- 8in, LUL HOTDOG BUN 3S, Sandwich buns- 6in*4

## Key Files
- `frontend/app/(admin)/reports.tsx` - Main reports with 3 tabs
- `frontend/app/(admin)/dashboard.tsx` - Admin dashboard
- `frontend/services/api.ts` - API service layer
- `backend/server.py` - All backend endpoints

## IMPORTANT: Production Deploy Needed
The WhatsApp numbers management endpoints are new and need to be deployed to Render.com. The user must push updated `server.py` to GitHub for Render auto-deploy.

## Backlog
- P2: Refactor `reports.tsx` (1700+ lines) into smaller components
- P2: Report History feature (save completed reports to DB)
- P3: Copy Staff List feature between sections

## Credentials (Dev)
- Admin: username=Soman, password=Soman@123
