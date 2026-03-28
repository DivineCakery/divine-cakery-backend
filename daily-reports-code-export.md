# Daily Reports Feature - Complete Code Export

## Architecture Overview
- **Main Reports Page**: `reports.tsx` - 3 tabs (Daily Items, Prep List, Prep Report)
- **7 Section Report Pages**: Each section has a `{section}-report.tsx` and `{section}-tasks.tsx`
- **Backend**: FastAPI endpoints for section staff, section tasks, daily items report, preparation list
- **API Service**: Axios-based service layer in `api.ts`
- **Dependencies**: `expo-print`, `expo-sharing`, `@expo/vector-icons`

## Sections
| Key | Label | Report File | Tasks File |
|-----|-------|-------------|------------|
| top_room | Top Room | top-room-report.tsx | cleaning-tasks.tsx |
| dough_section | Dough Section | dough-section-report.tsx | dough-section-tasks.tsx |
| packing_section | Packing Section | packing-section-report.tsx | packing-section-tasks.tsx |
| angels_prep | Angels/Prep | angels-prep-report.tsx | angels-prep-tasks.tsx |
| cleaning_facilities | Cleaning/Facilities | cleaning-facilities-report.tsx | cleaning-facilities-tasks.tsx |
| supervisor | Supervisor | supervisor-report.tsx | supervisor-tasks.tsx |
| sales_team | Sales Team | sales-team-report.tsx | sales-team-tasks.tsx |

## DB Collections
- `section_tasks` - `{ section: str, daily_tasks: [], weekly_tasks: {}, checklist_items: [] }`
- `section_staff` - `{ section: str, members: [{ id, name, is_active }] }`

---

## FILE LIST (for the other agent)

### Frontend Files to Copy:
```
frontend/app/(admin)/reports.tsx
frontend/app/(admin)/top-room-report.tsx
frontend/app/(admin)/cleaning-tasks.tsx
frontend/app/(admin)/dough-section-report.tsx
frontend/app/(admin)/dough-section-tasks.tsx
frontend/app/(admin)/packing-section-report.tsx
frontend/app/(admin)/packing-section-tasks.tsx
frontend/app/(admin)/angels-prep-report.tsx
frontend/app/(admin)/angels-prep-tasks.tsx
frontend/app/(admin)/cleaning-facilities-report.tsx
frontend/app/(admin)/cleaning-facilities-tasks.tsx
frontend/app/(admin)/supervisor-report.tsx
frontend/app/(admin)/supervisor-tasks.tsx
frontend/app/(admin)/sales-team-report.tsx
frontend/app/(admin)/sales-team-tasks.tsx
```

### API Service Methods (add to your api.ts):
```typescript
  // === DAILY REPORTS API METHODS ===

  async getDoughTypes() {
    const response = await this.api.get('/dough-types');
    return response.data;
  }

  async getDailyItemsReport(date?: string, doughTypeId?: string) {
    const params: any = {};
    if (date) params.date = date;
    if (doughTypeId) params.dough_type_id = doughTypeId;
    const response = await this.api.get('/admin/reports/daily-items', { params });
    return response.data;
  }

  async getPreparationListReport(date?: string, doughTypeId?: string) {
    const params: any = {};
    if (date) params.date = date;
    if (doughTypeId) params.dough_type_id = doughTypeId;
    const response = await this.api.get('/admin/reports/preparation-list', { params });
    return response.data;
  }

  // Section-specific Tasks APIs
  async getSectionTasks(sectionKey: string) {
    const response = await this.api.get(`/admin/section-tasks/${sectionKey}`);
    return response.data;
  }

  async updateSectionTasks(sectionKey: string, data: { daily_tasks?: string[]; weekly_tasks?: any; checklist_items?: any[] }) {
    const response = await this.api.put(`/admin/section-tasks/${sectionKey}`, data);
    return response.data;
  }

  // Section-specific Staff APIs (independent staff per section)
  async getSectionStaff(sectionKey: string) {
    const response = await this.api.get(`/admin/section-staff/${sectionKey}`);
    return response.data;
  }

  async addSectionStaff(sectionKey: string, name: string) {
    const response = await this.api.post(`/admin/section-staff/${sectionKey}/add`, { name });
    return response.data;
  }

  async removeSectionStaff(sectionKey: string, staffId: string) {
    const response = await this.api.delete(`/admin/section-staff/${sectionKey}/${staffId}`);
    return response.data;
  }
```

---

## BACKEND ENDPOINTS (add to your server.py)

```python
# ==================== SECTION-SPECIFIC TASKS ENDPOINTS ====================
# Each section stores its own daily/weekly task lists in the section_tasks collection.

VALID_SECTIONS = [
    "top_room", "dough_section", "packing_section", "angels_prep",
    "cleaning_facilities", "supervisor", "sales_team"
]

DEFAULT_CHECKLIST_ITEMS = [
    {"id": "default_1", "label": "Daily Production completed", "notes_when": "unchecked", "notes_placeholder": "Items not completed..."},
    {"id": "default_2", "label": "Daily Cleaning completed", "notes_when": "unchecked", "notes_placeholder": "Which task not completed..."},
    {"id": "default_3", "label": "Weekly Deep Cleaning completed", "notes_when": "unchecked", "notes_placeholder": "Which task not completed..."},
    {"id": "default_4", "label": "Wastage reported", "notes_when": "checked", "notes_placeholder": "Items wasted..."}
]

@api_router.get("/admin/section-tasks/{section_key}")
async def get_section_tasks(section_key: str, current_user: User = Depends(get_current_admin)):
    """Get tasks and checklist configuration for a specific report section"""
    if section_key not in VALID_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid section: {section_key}")
    empty_weekly = {"monday":"","tuesday":"","wednesday":"","thursday":"","friday":"","saturday":"","sunday":""}
    config = await db.section_tasks.find_one({"section": section_key})
    if not config:
        return {"daily_tasks": [], "weekly_tasks": empty_weekly, "checklist_items": DEFAULT_CHECKLIST_ITEMS}
    return {
        "daily_tasks": config.get("daily_tasks", []),
        "weekly_tasks": config.get("weekly_tasks", empty_weekly),
        "checklist_items": config.get("checklist_items", DEFAULT_CHECKLIST_ITEMS)
    }

@api_router.put("/admin/section-tasks/{section_key}")
async def update_section_tasks(section_key: str, tasks_update: dict, current_user: User = Depends(get_current_admin)):
    """Update tasks and checklist configuration for a specific report section"""
    if section_key not in VALID_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid section: {section_key}")
    if current_user.admin_access_level != "full":
        raise HTTPException(status_code=403, detail="Only full-access admins can edit tasks")
    update_data = {"section": section_key}
    if "daily_tasks" in tasks_update:
        update_data["daily_tasks"] = tasks_update["daily_tasks"]
    if "weekly_tasks" in tasks_update:
        update_data["weekly_tasks"] = tasks_update["weekly_tasks"]
    if "checklist_items" in tasks_update:
        update_data["checklist_items"] = tasks_update["checklist_items"]
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = current_user.username
    await db.section_tasks.update_one(
        {"section": section_key},
        {"$set": update_data},
        upsert=True
    )
    return {"message": f"{section_key} tasks updated successfully"}

# ==================== SECTION-SPECIFIC STAFF ENDPOINTS ====================
# Each section has its own independent staff list

@api_router.get("/admin/section-staff/{section_key}")
async def get_section_staff(section_key: str, current_user: User = Depends(get_current_admin)):
    """Get staff list for a specific section"""
    if section_key not in VALID_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid section: {section_key}")
    config = await db.section_staff.find_one({"section": section_key})
    if not config:
        return {"staff": []}
    return {"staff": config.get("members", [])}

@api_router.post("/admin/section-staff/{section_key}/add")
async def add_section_staff(section_key: str, staff_data: dict, current_user: User = Depends(get_current_admin)):
    """Add a staff member to a specific section"""
    if section_key not in VALID_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid section: {section_key}")
    if current_user.admin_access_level != "full":
        raise HTTPException(status_code=403, detail="Only full-access admins can manage staff")
    name = staff_data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Staff name is required")
    new_member = {"id": str(uuid.uuid4()), "name": name, "is_active": True}
    await db.section_staff.update_one(
        {"section": section_key},
        {"$push": {"members": new_member}, "$set": {"section": section_key}},
        upsert=True
    )
    return {"message": "Staff member added", "member": new_member}

@api_router.delete("/admin/section-staff/{section_key}/{staff_id}")
async def remove_section_staff(section_key: str, staff_id: str, current_user: User = Depends(get_current_admin)):
    """Remove a staff member from a specific section"""
    if section_key not in VALID_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid section: {section_key}")
    if current_user.admin_access_level != "full":
        raise HTTPException(status_code=403, detail="Only full-access admins can manage staff")
    await db.section_staff.update_one(
        {"section": section_key},
        {"$pull": {"members": {"id": staff_id}}}
    )
    return {"message": "Staff member removed"}


@api_router.get("/admin/reports/daily-items")
async def get_daily_items_report(
    date: str = None,
    dough_type_id: str = None,
    current_user: User = Depends(get_current_admin)
):
    """Get daily report of items ordered by delivery date
    Optional filter by dough_type_id to show only products of a specific dough type
    """
    from datetime import datetime as dt, timedelta
    import pytz
    
    ist = pytz.timezone('Asia/Kolkata')
    
    if date:
        try:
            delivery_date = dt.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        now_ist = dt.now(ist)
        delivery_date = now_ist.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    
    ist_start = ist.localize(delivery_date.replace(hour=0, minute=0, second=0, microsecond=0))
    ist_end = ist_start + timedelta(days=1)
    date_start = ist_start.astimezone(pytz.UTC).replace(tzinfo=None)
    date_end = ist_end.astimezone(pytz.UTC).replace(tzinfo=None)
    
    orders = await db.orders.find({
        "delivery_date": {"$gte": date_start, "$lt": date_end},
        "order_status": {"$ne": OrderStatus.CANCELLED}
    }).to_list(10000)
    
    product_dough_type_map = {}
    if dough_type_id:
        products_with_dough_type = await db.products.find(
            {"dough_type_id": dough_type_id}, 
            {"id": 1, "dough_type_id": 1}
        ).to_list(10000)
        product_dough_type_map = {p["id"]: p["dough_type_id"] for p in products_with_dough_type}
    
    dough_types = await db.categories.find({"category_type": "dough_type"}).to_list(100)
    dough_type_name_map = {dt_item["id"]: dt_item["name"] for dt_item in dough_types}
    
    item_summary = {}
    total_orders = len(orders)
    total_revenue = 0
    
    for order in orders:
        total_revenue += order.get("total_amount", 0)
        for item in order.get("items", []):
            product_id = item.get("product_id")
            product_name = item.get("product_name", "Unknown")
            quantity = item.get("quantity", 0)
            price = item.get("price", 0)
            subtotal = item.get("subtotal", 0)
            
            if dough_type_id and product_id not in product_dough_type_map:
                continue
            
            if product_id in item_summary:
                item_summary[product_id]["quantity"] += quantity
                item_summary[product_id]["revenue"] += subtotal
                item_summary[product_id]["order_count"] += 1
            else:
                product_data = await db.products.find_one({"id": product_id}, {"dough_type_id": 1})
                product_dough_type_id = product_data.get("dough_type_id") if product_data else None
                
                item_summary[product_id] = {
                    "product_id": product_id,
                    "product_name": product_name,
                    "quantity": quantity,
                    "price": price,
                    "revenue": subtotal,
                    "order_count": 1,
                    "dough_type_id": product_dough_type_id,
                    "dough_type_name": dough_type_name_map.get(product_dough_type_id) if product_dough_type_id else None
                }
    
    items_list = sorted(item_summary.values(), key=lambda x: x["quantity"], reverse=True)
    
    return {
        "date": delivery_date.strftime("%Y-%m-%d"),
        "day_name": delivery_date.strftime("%A"),
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "items": items_list,
        "filter_dough_type_id": dough_type_id,
        "filter_dough_type_name": dough_type_name_map.get(dough_type_id) if dough_type_id else None
    }


@api_router.get("/admin/reports/preparation-list")
async def get_preparation_list_report(
    date: str = None,
    dough_type_id: str = None,
    current_user: User = Depends(get_current_admin)
):
    """Get preparation list report: Shows products with orders for today and/or tomorrow
    Optional filter by dough_type_id
    """
    import pytz
    from datetime import datetime as dt
    from datetime import timedelta
    
    ist = pytz.timezone('Asia/Kolkata')
    
    if date:
        try:
            report_date = dt.strptime(date, "%Y-%m-%d")
            report_date = ist.localize(report_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        now_ist = dt.now(ist)
        report_date = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    
    product_query = {}
    if dough_type_id:
        product_query["dough_type_id"] = dough_type_id
    
    products_cursor = db.products.find(product_query, {"image_base64": 0})
    products = await products_cursor.to_list(10000)
    
    dough_types = await db.categories.find({"category_type": "dough_type"}).to_list(100)
    dough_type_map = {dt["id"]: dt["name"] for dt in dough_types}
    
    today_start_ist = report_date.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_ist = today_start_ist + timedelta(days=1)
    tomorrow_start_ist = today_end_ist
    tomorrow_end_ist = tomorrow_start_ist + timedelta(days=1)
    
    today_start_utc = today_start_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    today_end_utc = today_end_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    tomorrow_start_utc = tomorrow_start_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    tomorrow_end_utc = tomorrow_end_ist.astimezone(pytz.UTC).replace(tzinfo=None)
    
    orders_today_cursor = db.orders.find({
        "$or": [
            {"delivery_date": {"$gte": today_start_utc, "$lt": today_end_utc}},
            {"delivery_date": {"$gte": today_start_ist.replace(tzinfo=None), "$lt": today_end_ist.replace(tzinfo=None)}}
        ],
        "order_status": {"$nin": [OrderStatus.CANCELLED, "cancelled"]}
    })
    orders_today = await orders_today_cursor.to_list(10000)
    
    orders_tomorrow_cursor = db.orders.find({
        "$or": [
            {"delivery_date": {"$gte": tomorrow_start_utc, "$lt": tomorrow_end_utc}},
            {"delivery_date": {"$gte": tomorrow_start_ist.replace(tzinfo=None), "$lt": tomorrow_end_ist.replace(tzinfo=None)}}
        ],
        "order_status": {"$nin": [OrderStatus.CANCELLED, "cancelled"]}
    })
    orders_tomorrow = await orders_tomorrow_cursor.to_list(10000)
    
    ordered_quantities_today = {}
    for order in orders_today:
        for item in order.get("items", []):
            product_id = item.get("product_id")
            quantity = item.get("quantity", 0)
            if product_id in ordered_quantities_today:
                ordered_quantities_today[product_id] += quantity
            else:
                ordered_quantities_today[product_id] = quantity
    
    ordered_quantities_tomorrow = {}
    for order in orders_tomorrow:
        for item in order.get("items", []):
            product_id = item.get("product_id")
            quantity = item.get("quantity", 0)
            if product_id in ordered_quantities_tomorrow:
                ordered_quantities_tomorrow[product_id] += quantity
            else:
                ordered_quantities_tomorrow[product_id] = quantity
    
    all_product_ids = set(ordered_quantities_today.keys()) | set(ordered_quantities_tomorrow.keys())
    
    preparation_list = []
    for product in products:
        product_id = product.get("id")
        if product_id not in all_product_ids:
            continue
        product_name = product.get("name")
        previous_closing_stock = product.get("previous_closing_stock", product.get("closing_stock", 0))
        ordered_today = ordered_quantities_today.get(product_id, 0)
        ordered_tomorrow = ordered_quantities_tomorrow.get(product_id, 0)
        total = ordered_today + ordered_tomorrow - previous_closing_stock
        units_to_prepare = max(0, total)
        
        preparation_list.append({
            "product_id": product_id,
            "product_name": product_name,
            "dough_type_id": product.get("dough_type_id"),
            "dough_type_name": dough_type_map.get(product.get("dough_type_id"), None),
            "previous_closing_stock": previous_closing_stock,
            "orders_today": ordered_today,
            "orders_tomorrow": ordered_tomorrow,
            "total": total,
            "units_to_prepare": units_to_prepare,
            "unit": product.get("unit", "piece")
        })
    
    preparation_list.sort(key=lambda x: x["units_to_prepare"], reverse=True)
    
    return {
        "date": report_date.strftime("%Y-%m-%d"),
        "day_name": report_date.strftime("%A"),
        "total_items": len(preparation_list),
        "orders_today_count": len(orders_today),
        "orders_tomorrow_count": len(orders_tomorrow),
        "items": preparation_list
    }
```

---

## FRONTEND: SAMPLE SECTION REPORT PAGE (top-room-report.tsx pattern)

All 7 section report pages follow the same pattern. Here's the template — just change `SECTION_KEY`, `SECTION_TITLE`, and the navigation routes:

The actual file is at: `frontend/app/(admin)/top-room-report.tsx`
(Use `cat frontend/app/(admin)/top-room-report.tsx` to get the full file — it's ~500 lines)

Key pattern:
```typescript
const SECTION_KEY = 'top_room'; // Change per section
const SECTION_TITLE = 'Top Room Report';
// Uses: apiService.getSectionStaff(SECTION_KEY)
// Uses: apiService.getSectionTasks(SECTION_KEY)
// Features: Staff attendance, daily/weekly tasks, checklist items, WhatsApp report sending
```

## FRONTEND: SAMPLE SECTION TASKS PAGE (cleaning-tasks.tsx pattern)

All 7 task pages follow the same pattern. Here's the template:

The actual file is at: `frontend/app/(admin)/cleaning-tasks.tsx`
Key pattern:
```typescript
const SECTION_KEY = 'top_room'; // Change per section
const SECTION_TITLE = 'Top Room Tasks';
// Uses: apiService.getSectionTasks(SECTION_KEY)
// Uses: apiService.updateSectionTasks(SECTION_KEY, data)
// Features: Edit daily tasks, weekly tasks, checklist items
```

---

## NPM DEPENDENCIES NEEDED
```json
{
  "expo-print": "latest",
  "expo-sharing": "latest",
  "@expo/vector-icons": "latest"
}
```

## NOTES FOR THE OTHER AGENT
1. All section report/task pages are nearly identical — only `SECTION_KEY` and `SECTION_TITLE` differ
2. `reports.tsx` is the main hub with 3 tabs: Daily Items, Prep List, Prep Report
3. The Prep Report has special Burger Dough filtering logic — 5 specific items are moved from Dough Section to Top Room
4. The PDF/Print uses a hidden iframe approach on web, and expo-print on native
5. Today/Tmrw values in Prep Report are adjusted by subtracting closing stock
6. Staff lists are independent per section (stored in `section_staff` collection)
7. Tasks/checklists are independent per section (stored in `section_tasks` collection)
