# Divine Cakery - Admin Dashboard PRD

## Problem Statement
Logistics and ordering dashboard for Divine Cakery bakery. React Native Expo frontend + FastAPI backend with MongoDB Atlas (production DB: `divine_cakery`).

## Core Features
- Role-based access (admin, customer)
- Order management with pay-later support
- Prep Reports & Route Summaries (PDF generation)
- Excess Stock calculation popup
- Standing orders system
- Admin place order on behalf of customers

## Completed Work

### Session 1-5 (Previous)
- Lulu Trip PDF strict single-page A4 portrait
- Prep Report duplicate orders fix
- Excess Stock modal popup
- AsyncStorage persistence for prepared quantities
- Mobile layout fixes (scrolling, button visibility)

### Session 6 (Apr 5, 2026)
- **Admin Place Order - Custom Delivery Date (P0 DONE)**
  - Added date picker UI with prev/next day navigation in `admin-place-order.tsx`
  - Backend accepts `delivery_date` (YYYY-MM-DD) from admin payload, converts IST midnight to UTC for storage
  - Falls back to auto-calculated date when not provided
  - All 6 backend tests passed (100%)

## Pending Issues
- **P1**: Multigrain & PVR Sandwich department assignments in Prep Report
- **P2**: Android EAS build verification
- **P0**: Deploy backend to Render (production sync)

## Backlog
- P2: Refactor `reports.tsx` (>2000 lines, needs modularization)
- P2: Report History feature (snapshot daily reports to DB)
- P3: Copy Staff List between sections

## Architecture
```
/app
├── backend/server.py (FastAPI + Motor)
├── frontend/app/(admin)/
│   ├── admin-place-order.tsx (date picker added)
│   ├── reports.tsx (>2000 lines, needs refactor)
│   └── route-summaries.tsx
```

## Key Technical Notes
- PRODUCTION DB: MongoDB Atlas `divine_cakery` - NO bulk writes without user approval
- Timezone: All dates IST-based. Stored as UTC midnight IST in DB
- `delivery_date` format: YYYY-MM-DD (IST) → stored as naive UTC datetime
