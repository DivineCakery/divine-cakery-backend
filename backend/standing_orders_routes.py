# Standing Orders Routes
import uuid
import os
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException, Depends, Request

from models import (
    StandingOrder, StandingOrderCreate, StandingOrderUpdate, StandingOrderStatus,
    RecurrenceType, DurationType, User, Order
)


async def generate_orders_for_standing_order(db, standing_order: dict, days_ahead: int = 10):
    """Generate orders for the next N days based on standing order configuration"""
    import logging
    logger = logging.getLogger(__name__)
    
    generated_orders = []
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    logger.info(f"Generating orders for standing order: {standing_order.get('id')}")
    logger.info(f"Recurrence type: {standing_order.get('recurrence_type')}")
    logger.info(f"Recurrence config: {standing_order.get('recurrence_config')}")
    
    # Get customer details
    customer = await db.users.find_one({"id": standing_order["customer_id"]})
    if not customer:
        return generated_orders
    
    for day_offset in range(1, days_ahead + 1):
        delivery_date = today + timedelta(days=day_offset)
        
        # Check if order should be created for this date
        should_create = False
        
        if standing_order["recurrence_type"] == "weekly_days":
            # Check if this day of week is in the configuration
            weekday = delivery_date.weekday()  # Monday=0, Sunday=6
            configured_days = standing_order["recurrence_config"].get("days", [])
            logger.info(f"Checking date {delivery_date.strftime('%Y-%m-%d')} (weekday={weekday}) against configured days: {configured_days}")
            if weekday in configured_days:
                should_create = True
                logger.info(f"✓ Should create order for {delivery_date.strftime('%Y-%m-%d')}")
        
        elif standing_order["recurrence_type"] == "interval":
            # Check if this date matches the interval pattern
            interval = standing_order["recurrence_config"].get("days", 1)
            days_since_creation = (delivery_date - standing_order["created_at"].replace(hour=0, minute=0, second=0, microsecond=0)).days
            if days_since_creation > 0 and days_since_creation % interval == 0:
                should_create = True
        
        if should_create:
            # Check if end date has passed
            if standing_order["duration_type"] == "end_date" and standing_order.get("end_date"):
                # Handle timezone-aware datetimes
                end_date = standing_order["end_date"]
                if hasattr(end_date, 'tzinfo') and end_date.tzinfo:
                    end_date = end_date.replace(tzinfo=None)
                end_date_only = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
                if delivery_date > end_date_only:
                    continue
            
            # Check if order already exists for this customer on this date (avoid duplicates)
            existing_order = await db.orders.find_one({
                "user_id": standing_order["customer_id"],
                "delivery_date": delivery_date,
                "standing_order_id": standing_order["id"]
            })
            
            if existing_order:
                continue  # Skip if order already exists
            
            # Calculate order total and add subtotals to items
            items_with_subtotal = []
            for item in standing_order["items"]:
                item_with_subtotal = {**item, "subtotal": item["price"] * item["quantity"]}
                items_with_subtotal.append(item_with_subtotal)
            
            total_amount = sum(item["subtotal"] for item in items_with_subtotal)
            
            # Create order
            order_dict = {
                "id": str(uuid.uuid4()),
                "order_number": str(uuid.uuid4())[:8].upper(),
                "user_id": standing_order["customer_id"],
                "items": items_with_subtotal,
                "total_amount": total_amount,
                "discount_amount": 0,
                "final_amount": total_amount,
                "order_status": "confirmed",  # Auto-confirmed
                "payment_status": "pending",
                "payment_method": "wallet",
                "notes": f"Auto-generated from standing order. {standing_order.get('notes', '')}".strip(),
                "delivery_date": delivery_date,
                "standing_order_id": standing_order["id"],
                "is_standing_order": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await db.orders.insert_one(order_dict)
            generated_orders.append(order_dict)
    
    return generated_orders


def setup_standing_orders_routes(api_router, db, get_current_admin):
    """Setup all standing orders routes"""
    
    @api_router.post("/admin/standing-orders", response_model=StandingOrder)
    async def create_standing_order(
        standing_order_data: StandingOrderCreate,
        current_user: User = Depends(get_current_admin)
    ):
        """Create a new standing order and generate orders for next 10 days"""
        # Validate customer exists
        customer = await db.users.find_one({"id": standing_order_data.customer_id})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Validate end date if provided
        if standing_order_data.duration_type == DurationType.END_DATE:
            if not standing_order_data.end_date:
                raise HTTPException(status_code=400, detail="End date required for end_date duration type")
            # Remove timezone info for comparison
            end_date_naive = standing_order_data.end_date.replace(tzinfo=None) if standing_order_data.end_date.tzinfo else standing_order_data.end_date
            if end_date_naive < datetime.utcnow():
                raise HTTPException(status_code=400, detail="End date must be in the future")
        
        # Create standing order
        standing_order_dict = {
            "id": str(uuid.uuid4()),
            **standing_order_data.dict(),
            "customer_name": customer.get("name", customer.get("username")),
            "status": StandingOrderStatus.ACTIVE,
            "created_at": datetime.utcnow(),
            "created_by": current_user.username
        }
        
        # Calculate next delivery date based on recurrence
        next_delivery = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        standing_order_dict["next_delivery_date"] = next_delivery
        
        await db.standing_orders.insert_one(standing_order_dict)
        
        # Generate orders for next 10 days
        await generate_orders_for_standing_order(db, standing_order_dict, days_ahead=10)
        
        return StandingOrder(**standing_order_dict)
    
    
    @api_router.get("/admin/standing-orders", response_model=List[StandingOrder])
    async def get_standing_orders(
        status: Optional[StandingOrderStatus] = None,
        current_user: User = Depends(get_current_admin)
    ):
        """Get all standing orders with optional status filter"""
        query = {}
        if status:
            query["status"] = status
        
        standing_orders = await db.standing_orders.find(query).to_list(1000)
        return [StandingOrder(**so) for so in standing_orders]
    
    
    @api_router.get("/admin/standing-orders/{standing_order_id}", response_model=StandingOrder)
    async def get_standing_order(
        standing_order_id: str,
        current_user: User = Depends(get_current_admin)
    ):
        """Get a specific standing order"""
        standing_order = await db.standing_orders.find_one({"id": standing_order_id})
        if not standing_order:
            raise HTTPException(status_code=404, detail="Standing order not found")
        return StandingOrder(**standing_order)
    
    
    @api_router.get("/admin/standing-orders/{standing_order_id}/generated-orders")
    async def get_generated_orders(
        standing_order_id: str,
        current_user: User = Depends(get_current_admin)
    ):
        """Get all orders generated from a standing order"""
        orders = await db.orders.find({"standing_order_id": standing_order_id}).to_list(1000)
        return [Order(**order) for order in orders]
    
    
    @api_router.put("/admin/standing-orders/{standing_order_id}", response_model=StandingOrder)
    async def update_standing_order(
        standing_order_id: str,
        standing_order_data: StandingOrderUpdate,
        current_user: User = Depends(get_current_admin)
    ):
        """Update a standing order"""
        standing_order = await db.standing_orders.find_one({"id": standing_order_id})
        if not standing_order:
            raise HTTPException(status_code=404, detail="Standing order not found")
        
        update_data = {k: v for k, v in standing_order_data.dict().items() if v is not None}
        
        # If cancelling, delete future auto-generated orders
        if update_data.get("status") == StandingOrderStatus.CANCELLED:
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            await db.orders.delete_many({
                "standing_order_id": standing_order_id,
                "delivery_date": {"$gte": today},
                "is_standing_order": True
            })
        
        result = await db.standing_orders.update_one(
            {"id": standing_order_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and not result.matched_count:
            raise HTTPException(status_code=404, detail="Standing order not found")
        
        # If reactivating or changing recurrence, regenerate orders
        if update_data.get("status") == StandingOrderStatus.ACTIVE or "recurrence_type" in update_data:
            updated_standing_order = await db.standing_orders.find_one({"id": standing_order_id})
            await generate_orders_for_standing_order(db, updated_standing_order, days_ahead=10)
        
        updated_standing_order = await db.standing_orders.find_one({"id": standing_order_id})
        return StandingOrder(**updated_standing_order)
    
    
    @api_router.post("/admin/standing-orders/{standing_order_id}/regenerate")
    async def regenerate_standing_order_orders(
        standing_order_id: str,
        days_ahead: int = 10,
        current_user: User = Depends(get_current_admin)
    ):
        """Manually regenerate orders for a standing order"""
        standing_order = await db.standing_orders.find_one({"id": standing_order_id})
        if not standing_order:
            raise HTTPException(status_code=404, detail="Standing order not found")
        
        if standing_order["status"] != StandingOrderStatus.ACTIVE:
            raise HTTPException(status_code=400, detail="Can only regenerate active standing orders")
        
        generated_orders = await generate_orders_for_standing_order(db, standing_order, days_ahead=days_ahead)
        
        return {
            "message": f"Generated {len(generated_orders)} orders",
            "orders_count": len(generated_orders)
        }
    
    
    @api_router.delete("/admin/standing-orders/{standing_order_id}")
    async def delete_standing_order(
        standing_order_id: str,
        current_user: User = Depends(get_current_admin)
    ):
        """Delete a standing order and all its future generated orders"""
        standing_order = await db.standing_orders.find_one({"id": standing_order_id})
        if not standing_order:
            raise HTTPException(status_code=404, detail="Standing order not found")
        
        # Delete future auto-generated orders
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        await db.orders.delete_many({
            "standing_order_id": standing_order_id,
            "delivery_date": {"$gte": today},
            "is_standing_order": True
        })
        
        # Delete standing order
        result = await db.standing_orders.delete_one({"id": standing_order_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Standing order not found")
        
        return {"message": "Standing order deleted successfully"}
    
    
    @api_router.post("/admin/standing-orders/regenerate-all")
    async def regenerate_all_standing_orders(
        days_ahead: int = 10,
        current_user: User = Depends(get_current_admin)
    ):
        """
        Regenerate orders for ALL active standing orders.
        This should be called daily (via cron job or scheduler) to ensure
        standing orders always have the next 10 days of orders generated.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Get all active standing orders
        active_orders = await db.standing_orders.find({
            "status": StandingOrderStatus.ACTIVE
        }).to_list(1000)
        
        total_generated = 0
        processed_count = 0
        
        for standing_order in active_orders:
            try:
                # Check if standing order has ended (for end_date type)
                if standing_order.get("duration_type") == "end_date" and standing_order.get("end_date"):
                    end_date = standing_order["end_date"]
                    if hasattr(end_date, 'tzinfo') and end_date.tzinfo:
                        end_date = end_date.replace(tzinfo=None)
                    if end_date < datetime.utcnow():
                        # Mark as completed
                        await db.standing_orders.update_one(
                            {"id": standing_order["id"]},
                            {"$set": {"status": StandingOrderStatus.COMPLETED}}
                        )
                        logger.info(f"Standing order {standing_order['id']} marked as completed (end date passed)")
                        continue
                
                generated = await generate_orders_for_standing_order(db, standing_order, days_ahead=days_ahead)
                total_generated += len(generated)
                processed_count += 1
                
                if generated:
                    logger.info(f"Generated {len(generated)} orders for standing order {standing_order['id']}")
            except Exception as e:
                logger.error(f"Error regenerating standing order {standing_order['id']}: {str(e)}")
        
        return {
            "message": f"Processed {processed_count} active standing orders, generated {total_generated} new orders",
            "processed_standing_orders": processed_count,
            "total_orders_generated": total_generated
        }
    
    
    @api_router.post("/cron/standing-orders/regenerate")
    async def cron_regenerate_standing_orders(
        request: Request,
        days_ahead: int = 10
    ):
        """
        Public endpoint for cron job to regenerate standing orders.
        Protected by a simple secret key in header.
        Call this daily to ensure standing orders always have future orders generated.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Simple protection - check for cron secret header
        cron_secret = request.headers.get("X-Cron-Secret")
        expected_secret = os.environ.get("CRON_SECRET", "divine-cakery-cron-2024")
        
        if cron_secret != expected_secret:
            raise HTTPException(status_code=401, detail="Invalid cron secret")
        
        # Get all active standing orders
        active_orders = await db.standing_orders.find({
            "status": StandingOrderStatus.ACTIVE
        }).to_list(1000)
        
        total_generated = 0
        processed_count = 0
        
        for standing_order in active_orders:
            try:
                # Check if standing order has ended
                if standing_order.get("duration_type") == "end_date" and standing_order.get("end_date"):
                    end_date = standing_order["end_date"]
                    if hasattr(end_date, 'tzinfo') and end_date.tzinfo:
                        end_date = end_date.replace(tzinfo=None)
                    if end_date < datetime.utcnow():
                        await db.standing_orders.update_one(
                            {"id": standing_order["id"]},
                            {"$set": {"status": StandingOrderStatus.COMPLETED}}
                        )
                        continue
                
                generated = await generate_orders_for_standing_order(db, standing_order, days_ahead=days_ahead)
                total_generated += len(generated)
                processed_count += 1
            except Exception as e:
                logger.error(f"Error in cron regeneration for {standing_order['id']}: {str(e)}")
        
        logger.info(f"Cron: Regenerated {total_generated} orders for {processed_count} standing orders")
        
        return {
            "success": True,
            "processed": processed_count,
            "generated": total_generated
        }
