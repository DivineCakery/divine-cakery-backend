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

### Session 6 (Apr 5-6, 2026)
- **Admin Place Order - Custom Delivery Date (P0 DONE)**
  - Added date picker UI with prev/next day navigation in `admin-place-order.tsx`
  - Backend accepts `delivery_date` (YYYY-MM-DD) from admin payload, converts IST midnight to UTC for storage
  - Falls back to auto-calculated date when not provided

- **Prep Report IST/UTC Date Query Bug Fix (P0 DONE)**
  - Fixed `get_preparation_list_report` in `server.py` — was querying MongoDB with raw IST timestamps instead of UTC-converted values
  - Now uses proper UTC range: April 5 IST = `2026-04-04T18:30:00Z` to `2026-04-05T18:30:00Z`

- **Wallet Double-Credit Bug Fix (P0 DONE)**
  - Webhook, callback, AND verify endpoints all incremented wallet without checking if transaction was already processed
  - Added idempotency check (`status != SUCCESS`) to all 3 handlers
  - Corrected 3 affected wallets: Bao Tao (-4000), Hungry (-100), Mrs. Anu Koshy (-250)
  - Fixed WRAP A LOOP balance sync (users vs wallets collection)

- **Render Production Deployment (P0 DONE)**
  - Auto-deploy confirmed enabled on `divine-cakery-backend` service
  - All fixes deployed to production: https://divine-cakery-backend.onrender.com
  - Render API key stored for future use

## Production Infrastructure
- **Render Service**: `divine-cakery-backend` (srv-d48l3124d50c738rgoo0)
- **Production URL**: https://divine-cakery-backend.onrender.com
- **Auto-Deploy**: Enabled from `main` branch of `divine-cakery-backend` GitHub repo
- **Render API Key**: rnd_wfR7undzBDItXZZp8TCdvwA6BKdv

### Session 7 (Apr 22, 2026)
- **Delete Button Visibility Fix for Confirmed Orders (P0 DONE)**
  - Fixed CSS/flexbox issue in `manage-orders.tsx` where Delete button was hidden on non-standing confirmed orders
  - Root cause: `styles.statusButton` (`flex: 1`) on both Confirmed badge and Delete button caused Delete to be pushed off-screen
  - Fix: Removed `styles.statusButton` from the Delete button so it auto-sizes to content
  - Both standing and non-standing confirmed orders now show the Delete button correctly

## Pending Issues
- **P1**: Multigrain & PVR Sandwich department assignments in Prep Report
- **P2**: Android EAS build verification

## Backlog
- P2: Refactor `reports.tsx` into smaller components (>2000 lines)
- P2: Report History feature (snapshot daily reports to DB)
- P3: Copy Staff List feature between sections

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
- Prep Report queries MUST use UTC-converted ranges for delivery_date filtering
- Wallet topup: Only credit once per transaction (check status before incrementing)
