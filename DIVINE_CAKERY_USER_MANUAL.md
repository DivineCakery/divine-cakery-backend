# Divine Cakery - User Manual

**Version:** 1.0.0  
**Last Updated:** June 2025  
**Platform:** Android & iOS Mobile Application

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Customer Features](#3-customer-features)
4. [Admin Features](#4-admin-features)
5. [Payment & Orders](#5-payment--orders)
6. [Common Workflows](#6-common-workflows)
7. [Troubleshooting](#7-troubleshooting)
8. [FAQ](#8-faq)

---

## 1. Introduction

### 1.1 About Divine Cakery App

Divine Cakery is a wholesale bakery management and ordering platform designed to streamline the ordering process between Divine Cakery and its business customers. The app provides:

- **For Customers:** Easy browsing, ordering, and tracking of bakery products
- **For Admins:** Complete business management including inventory, orders, customers, and reports

### 1.2 Key Features

✅ User registration with admin approval  
✅ Product catalog with images and pricing  
✅ Favorites system for quick reordering  
✅ Shopping cart with quantity controls  
✅ Multiple payment methods (UPI, Razorpay, Wallet)  
✅ Order tracking and history  
✅ Digital wallet system  
✅ WhatsApp integration for notifications  
✅ Admin dashboard with analytics  
✅ Customer discount management  
✅ Flexible delivery options  

### 1.3 System Requirements

**Mobile App:**
- Android 6.0 or higher
- iOS 12.0 or higher
- Internet connection required

**Web Access:**
- Modern web browser (Chrome, Safari, Firefox)
- Responsive design for all screen sizes

---

## 2. Getting Started

### 2.1 Installation

**Option 1: App Store / Play Store (Production)**
1. Open Google Play Store (Android) or App Store (iOS)
2. Search for "Divine Cakery"
3. Tap "Install" / "Get"
4. Wait for download and installation
5. Open the app

**Option 2: Testing via Expo Go**
1. Install "Expo Go" from Play Store / App Store
2. Open Expo Go
3. Scan QR code or enter URL provided by Divine Cakery
4. App loads automatically

**Option 3: Web Browser**
1. Visit: https://divine-cake-enhance.preview.emergentagent.com
2. Use on any device with a web browser

### 2.2 Customer Registration

**Step 1: Open Registration Form**
1. Launch Divine Cakery app
2. Tap "Register" button on login screen

**Step 2: Fill Registration Details**
- **Username:** Your preferred username (minimum 3 characters)
- **Email:** Valid email address
- **Phone:** 10-digit mobile number (for WhatsApp notifications)
- **Password:** Secure password (minimum 6 characters)
- **Business Name:** Your business/shop name
- **Address:** Complete delivery address

**Step 3: Submit & Wait for Approval**
1. Tap "Register" button
2. WhatsApp opens with notification sent to admin
3. Success message appears:
   > "✅ Registration Successful! Your account will be approved by the admin within 1 day. You will receive a WhatsApp confirmation once approved."
4. You'll be redirected to login screen

**Step 4: Approval Process**
- Admin receives WhatsApp notification
- Admin reviews your details
- Upon approval, you receive WhatsApp:
  > "🎉 Great news! Your Divine Cakery account has been approved! You can now login and start ordering."
- You can now login with your credentials

**Important Notes:**
- ⏱️ Approval typically takes less than 24 hours
- 📱 Ensure WhatsApp is installed to receive notifications
- ❌ You cannot login until admin approves your account

### 2.3 Customer Login

1. Enter your registered username
2. Enter your password
3. Tap "Login"
4. You'll be directed to the products page (dashboard)

**If Account Not Approved:**
You'll see error: "Your account is pending admin approval. You will be notified within 1 day."

### 2.4 Admin Login

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

**Important:** Change default password after first login for security.

---

## 3. Customer Features

### 3.1 Product Catalog

**Accessing Products:**
- Opens automatically after login
- Or tap "Products" tab in bottom navigation

**Product Information Displayed:**
- Product image
- Product name
- Description
- Packet size (e.g., "500g", "1kg")
- MRP (strike-through if discounted)
- **Selling Price** (in bold)
- Unit (e.g., "per kg", "per packet")
- Remarks (if any)

**Search Products:**
1. Tap search bar at top
2. Type product name
3. Results filter in real-time

**Heart Icon - Add to Favorites:**
- Tap empty heart ♡ → Product added to favorites (turns red ❤️)
- Tap filled heart ❤️ → Product removed from favorites

### 3.2 Favorites

**Purpose:** Save frequently ordered products for quick access

**Accessing Favorites:**
1. Tap "Favorites" tab in bottom navigation
2. View all saved products

**Features:**
- All your favorited products in one place
- Same product cards as main catalog
- Add to cart directly from favorites
- Remove from favorites by tapping red heart

**Managing Favorites:**
- Add: Tap heart on any product (Products page or Favorites page)
- Remove: Tap filled heart on product card
- Auto-sync: Changes reflect across all pages immediately

### 3.3 Shopping Cart

**Adding Items to Cart:**
1. On any product card, use + / - buttons to set quantity
2. Tap "Add to Cart" button
3. Success message confirms addition

**Viewing Cart:**
1. Tap "Cart" tab in bottom navigation
2. See all added items with:
   - Product details
   - Quantity
   - Price per unit
   - Total price per item

**Modifying Cart:**
- **Change Quantity:** Use + / - buttons
- **Remove Item:** Reduce quantity to 0 or swipe left (if implemented)
- **Clear Cart:** Tap "Cancel Order" button

**Cart Summary:**
- Subtotal
- Delivery charges (if applicable)
- Discount (if applied)
- **Total Amount** (in bold)

**Proceeding to Checkout:**
- Tap "Place Order" button at bottom
- Redirects to checkout screen

### 3.4 Checkout Process

**Step 1: Delivery Options**

Choose between:

**A. Pickup**
- No delivery charge
- Collect from Divine Cakery location
- No address needed

**B. Delivery**
- Delivery charge applied automatically
- Delivery address required
- Enter or confirm delivery address

**Step 2: Apply Discount (If Available)**

If admin has created a discount for you:
1. Tap "Apply Discount" button
2. Discount automatically applied
3. See discount details:
   - Original amount
   - Discount value
   - Final amount

**Step 3: Review Order Details**

**Order Summary:**
- Items ordered with quantities
- Subtotal
- Delivery charge (₹XX or ₹0.00)
- Discount applied (if any)
- **Total amount**

**Delivery Date:**
- Automatically calculated based on order time
- **Before 4 AM:** Same-day delivery
- **After 4 AM:** Next-day delivery
- Date displayed clearly

**Step 4: Select Payment Method**

**Option A: UPI Payment**
- Tap "UPI" option
- Continues with mock UPI flow (or actual UPI if integrated)

**Option B: Razorpay**
- Tap "Razorpay" option
- Opens Razorpay payment gateway
- Complete payment securely
- Payment confirmation received

**Option C: Wallet**
- Tap "Wallet" option
- Requires sufficient wallet balance
- Amount deducted instantly
- Order placed immediately

**Step 5: Order Confirmation**

After successful payment:
1. Order placed confirmation message
2. WhatsApp opens with pre-filled order confirmation
3. Order details sent to Divine Cakery
4. Redirected to orders page

### 3.5 Orders

**Accessing Orders:**
1. Tap "Orders" tab in bottom navigation
2. View all your orders

**Order Information Displayed:**

**Order Card Shows:**
- **Order Number** (format: YYMMDDXXXX)
- **Status Badge:**
  - 🟡 Pending (Yellow)
  - 🟢 Confirmed (Green)
  - 🔴 Cancelled (Red)
- **Total Amount**
- **Payment Method**
- **Order Date**
- **Delivery Date**
- **Items ordered** (expandable list)

**Viewing Order Details:**
1. Tap on any order card to expand
2. See complete item breakdown:
   - Product name
   - Quantity
   - Price per unit
   - Total per item

**Order Status:**
- **Pending:** Order placed, awaiting admin confirmation
- **Confirmed:** Order confirmed by admin, will be dispatched
- **Cancelled:** Order cancelled by admin or you

**Contact Support:**
- Tap "Contact Us" button (chat icon) in header
- Opens WhatsApp with Divine Cakery
- Get help with your orders

### 3.6 Wallet

**Purpose:** Digital wallet for quick, cashless payments

**Accessing Wallet:**
1. Tap "Wallet" tab in bottom navigation
2. View current balance

**Features:**
- **Current Balance:** Displayed prominently
- **Top Up:** Add money to wallet (if enabled for your account)
- **Transaction History:** See all wallet transactions
- **Usage:** Pay for orders during checkout

**Using Wallet for Payments:**
1. During checkout, select "Wallet" payment method
2. If balance sufficient → Order placed instantly
3. If insufficient → Error message, choose another method

**Top-Up Options (If Enabled):**
- UPI
- Razorpay
- Bank transfer (offline, contact admin)

### 3.7 Profile

**Accessing Profile:**
1. Tap "Profile" tab in bottom navigation

**Profile Information:**
- Username
- Email
- Phone number
- Business name
- Delivery address
- Account status

**Actions:**
- View account details
- Contact support
- Logout

**Logout:**
1. Tap logout button
2. Confirmation dialog appears
3. Confirm to logout
4. Redirected to login screen

### 3.8 Contact Us

**Accessing Contact Us:**

Contact button available on:
- Products page (top right)
- Orders page (top right)
- Checkout page (top right)

**How It Works:**
1. Tap chat bubble icon (Contact Us)
2. Alert appears:
   > "Contact Divine Cakery: Please leave us a message if phone is unanswered. We will respond as soon as possible."
3. Tap "Open WhatsApp"
4. WhatsApp opens with Divine Cakery number
5. Send your message

**When to Use:**
- Order inquiries
- Product questions
- Delivery issues
- Payment problems
- General support

---

## 4. Admin Features

### 4.1 Admin Login

**Accessing Admin Panel:**
1. Login with admin credentials
2. Redirected to admin dashboard

**Admin Navigation:**
- Dashboard
- Manage Products
- Manage Orders
- Manage Users
- Reports
- Profile

**Hidden Tabs (Access via Dashboard):**
- Pending Approvals
- Manage Discounts
- Delivery Settings
- Delivery Notes
- Customer Form
- Product Form

### 4.2 Dashboard

**Dashboard Overview:**

**Statistics Cards:**
1. **Total Customers**
   - Count of all registered customers
   - Quick view of customer base

2. **Pending Orders**
   - Orders awaiting confirmation
   - Requires immediate action

3. **Today's Revenue**
   - Revenue from orders delivered today
   - Helps track daily performance

**7-Day Revenue Breakdown:**
- Last 7 days revenue displayed
- Each day shows:
  - Day name (e.g., Monday)
  - Date
  - Revenue amount (₹)
  - Order count

**Quick Access Buttons:**

**For Full Access Admins:**
- **Pending Approvals** → Approve/reject new customer registrations
- **Manage Discounts** → Create and manage customer discounts
- **Delivery Settings** → Configure delivery charges
- **Delivery Notes** → Manage customer delivery notifications

**Navigation:**
- Easy access to all admin features
- Color-coded buttons with icons
- Quick shortcuts to common tasks

### 4.3 Pending Approvals

**Purpose:** Review and approve/reject new customer registrations

**Accessing:**
1. Tap "Pending Approvals" on dashboard
2. Or navigate via admin menu

**Pending Users List:**

**Each User Card Shows:**
- Profile icon
- Username
- Business name
- Phone number
- Email address
- Delivery address
- Registration date

**Badge Indicator:**
- Number badge shows count of pending approvals
- Visible on button

**Actions:**

**A. Approve Customer:**
1. Review customer details
2. Tap "Approve" button (green)
3. Confirmation dialog appears
4. Confirm approval
5. WhatsApp opens with approval message:
   > "🎉 Great news! Your Divine Cakery account has been approved! You can now login and start ordering. Welcome to our family! - Divine Cakery"
6. Send message to customer
7. Customer can now login

**B. Reject Customer:**
1. Review customer details
2. Tap "Reject" button (red)
3. Confirmation warning appears
4. Confirm rejection
5. Customer account and wallet deleted
6. WhatsApp opens with rejection message:
   > "Hello! Your Divine Cakery registration requires additional verification. Please call us at [Divine number] for account approval. Thank you! - Divine Cakery"
7. Send message to customer

**Empty State:**
- "No pending approvals"
- Green checkmark icon
- "All customers have been reviewed"

**Refresh:**
- Pull down to refresh list
- Auto-refreshes when tab is focused

### 4.4 Manage Products

**Product List:**
- All products displayed in scrollable list
- Search functionality at top
- Pull to refresh

**Product Card Information:**
- Product image or placeholder
- Product name
- MRP and Price
- Packet size
- Description
- Stock status (if implemented)

**Add New Product:**

1. Tap "Add Product" button (+ icon, top right)
2. Fill product form:

**Required Fields:**
- **Name:** Product name
- **Description:** Product details
- **Price:** Selling price (₹)
- **Unit:** per kg, per piece, per packet, etc.

**Optional Fields:**
- **MRP:** Maximum retail price (shows as strike-through if > price)
- **Category:** Product category
- **Packet Size:** e.g., "500g", "1kg"
- **Remarks:** Additional notes
- **Product Image:** Tap to upload from camera/gallery

3. Tap "Save Product"
4. Product added to catalog
5. Visible to all customers immediately

**Edit Product:**

1. Tap on product card
2. Or tap edit icon on product
3. Opens product form with existing data
4. Modify any fields
5. Change image if needed
6. Tap "Update Product"
7. Changes saved and reflected immediately

**Delete Product:**

1. Tap delete icon on product card
2. Confirmation dialog appears
3. Confirm deletion
4. Product removed from catalog
5. No longer visible to customers

**Product Image Upload:**

1. Tap image placeholder or existing image
2. Choose source:
   - Take Photo (camera)
   - Choose from Gallery
3. Image picker opens
4. Select/capture image
5. Image compressed and uploaded
6. Preview shown immediately

**Image Guidelines:**
- Format: JPG, PNG
- Recommended size: 500×500px minimum
- Max file size: 5MB
- Square ratio recommended

### 4.5 Manage Orders

**Order List:**

**Default View:**
- All orders sorted by newest first
- Color-coded status badges

**Date Filter:**
1. Use left/right arrows to navigate dates
2. Current date shown with day name
3. Filter orders by delivery date
4. Tap "Show All Orders" to clear filter

**Order Card Details:**

**Header:**
- Order number (YYMMDDXXXX format)
- Total amount (large, bold)
- Status badge (Pending/Confirmed/Cancelled)

**Customer Information:**
- Customer name
- Business name
- Delivery address
- Phone number
- **Edit button** to modify customer details

**Order Details:**
- Payment method (UPI/Razorpay/Wallet)
- Order date (when placed)
- Delivery date (when to deliver)
- **Edit button** to change delivery date
- Order type (Pickup/Delivery)
- Delivery charge (if applicable)
- Discount applied (if any)

**Items List:**
- Expandable/collapsible
- Each item shows:
  - Product name
  - Quantity × Price
  - Total

**Order Actions:**

**A. Change Order Status:**

Three status buttons available:
- **Pending** (Yellow) - Default state
- **Confirmed** (Green) - Order confirmed
- **Cancelled** (Red) - Order cancelled

**Confirming Order:**
1. Tap "Pending" button
2. Changes to "Confirmed" (grey, disabled)
3. WhatsApp opens with confirmation message for customer
4. Order marked as confirmed
5. Included in today's revenue (if delivery date is today)

**Cancelling Order:**
1. Tap "Cancel" button (red)
2. Confirmation dialog
3. Confirm cancellation
4. Order marked as cancelled
5. Excluded from revenue calculations

**B. Edit Delivery Date:**

1. Tap "Edit" button next to delivery date
2. Date picker modal opens
3. Select new delivery date
4. Tap "Confirm"
5. Date updated in database
6. WhatsApp opens with notification:
   > "Hello! Your order #XXX delivery date has been updated to [new date]. Thank you for your patience! - Divine Cakery"
7. Send message to customer
8. Updated date displayed on order

**Platform-specific:**
- **iOS:** Full modal with spinner picker
- **Android:** Native date picker dialog

**C. Edit Customer Details:**

1. Tap "Edit" button in customer section
2. Modal opens with form
3. Edit fields:
   - Customer name (username)
   - Delivery address
4. Tap "Save Changes"
5. Changes saved to customer profile
6. Updates permanently for all future orders
7. Success message confirms

**Important:** This edits the customer's actual profile, not just the order.

**Refresh Orders:**
- Pull down to refresh list
- Auto-refreshes when tab is focused

### 4.6 Manage Users

**User List:**

**View All Users:**
- Customers and Admins both shown
- Differentiated by styling

**User Card Information:**
- Username
- Business name
- Email
- Phone number
- Role (Customer/Admin)
- Admin access level (if admin)
- Account status
- Wallet balance
- Registration date

**Visual Distinction:**
- Admin users highlighted in different color
- Customer users in standard color

**Add New User:**

1. Tap "Add Customer" button
2. Opens customer form
3. Fill details:
   - Username
   - Email
   - Phone
   - Password
   - Business name
   - Address
   - **Role:** Customer or Admin
   - **Admin Access Level:** (if admin selected)
     - Full Access
     - Orders Only
     - Reports Only
   - **Can Top-up Wallet:** Yes/No
4. Tap "Save"
5. User created and pre-approved
6. Can login immediately

**Edit User:**

1. Tap on user card
2. Opens edit form with existing data
3. Modify any field
4. Change role or access level
5. Tap "Update"
6. Changes saved

**Wallet Management:**
- View customer wallet balance
- Top-up if needed (manual process)
- Track wallet transactions

**Customer Search:**
- Search bar at top
- Filter by name, business, phone

### 4.7 Reports

**Accessing Reports:**
1. Tap "Reports" tab in admin navigation

**Report Types:**

**A. Daily Revenue Report:**
- Revenue for each day (last 30 days)
- Date-wise breakdown
- Order count per day
- Total revenue per day

**B. Daily Items Report:**

**Date Navigation:**
1. Use left/right arrows
2. Select date to view
3. Current date shown with day name

**Report Details:**
- Date selected
- Each product sold on that date:
  - Product name
  - Quantity sold
  - Unit price
  - Total value
- Excludes cancelled orders
- Based on delivery date, not order date

**Use Cases:**
- Plan production
- Track popular products
- Inventory management
- Revenue analysis
- Business insights

**Export Options:**
- View on screen
- Future: Export to PDF, Excel

### 4.8 Manage Discounts

**Purpose:** Create and manage customer-specific discounts

**Accessing:**
1. Dashboard → "Manage Discounts" button
2. Or via admin menu

**Discount List:**
- All active discounts
- Customer name
- Discount type
- Value
- Valid period

**Add New Discount:**

1. Tap "Add Discount" button (+ icon)
2. Fill discount form:

**Required Fields:**
- **Customer:** Select from dropdown
- **Discount Type:**
  - Percentage (e.g., 10%)
  - Fixed Amount (e.g., ₹50)
- **Discount Value:** Enter amount or percentage
- **Valid From:** Start date
- **Valid Until:** End date

3. Tap "Save Discount"
4. Discount created and active
5. Customer sees discount during checkout

**Discount Application:**
- Automatic during checkout
- "Apply Discount" button appears if eligible
- Shows original price, discount, final price
- Single discount per order

**Edit Discount:**
1. Tap on discount card
2. Modify details
3. Save changes
4. Updates immediately

**Delete Discount:**
1. Tap delete icon
2. Confirm deletion
3. Discount removed
4. Customer no longer sees discount

**Discount Validation:**
- Date-based activation/expiration
- Only one discount per customer at a time
- Percentage discounts calculated on subtotal
- Fixed discounts deducted from total

### 4.9 Delivery Settings

**Purpose:** Configure delivery charges for customers

**Accessing:**
1. Dashboard → "Delivery Settings" button
2. Or via admin menu

**Configuration Options:**

**Set Delivery Charge:**
- Enter amount (₹)
- Applies to all delivery orders
- Pickup orders always ₹0

**Save Changes:**
1. Enter new delivery charge
2. Tap "Save"
3. Updates immediately
4. All new orders use new charge

**How It Works:**
- Customer selects "Delivery" during checkout
- Delivery charge added automatically
- Shown in price breakdown
- Included in total amount

**Public Endpoint:**
- Customers fetch current delivery charge via API
- No login required
- Always shows latest charge

### 4.10 Admin Profile

**Accessing:**
1. Tap "Profile" tab in admin navigation

**Profile Information:**
- Username
- Email
- Role (Admin)
- Access level

**Actions:**
- View profile details
- Change password (if implemented)
- Logout

**Logout:**
1. Tap logout button
2. Confirm
3. Return to login screen

---

## 5. Payment & Orders

### 5.1 Payment Methods

**Available Options:**

**1. UPI Payment**
- Quick and easy
- Supports all UPI apps
- Real-time payment confirmation
- Status: Mock implementation (for testing)

**2. Razorpay Gateway**
- Credit/Debit cards
- Net banking
- UPI via Razorpay
- Wallets (Paytm, PhonePe, etc.)
- Secure and encrypted
- Live integration

**3. Wallet Payment**
- Fastest checkout
- No external gateway
- Instant confirmation
- Requires sufficient balance
- Can top-up via admin or other methods

### 5.2 Order Number Format

**Format:** YYMMDDXXXX

**Breakdown:**
- **YY:** Year (2 digits) - e.g., "25" for 2025
- **MM:** Month (2 digits) - e.g., "06" for June
- **DD:** Date (2 digits) - e.g., "15" for 15th
- **XXXX:** Sequential number (4 digits) - e.g., "0001"

**Example:** 2506150001
- Year: 2025
- Month: June (06)
- Date: 15th
- Order: 1st order of the day

**Benefits:**
- Easy to identify order date
- Sequential numbering
- Compact (10 digits)
- Human-readable

### 5.3 Delivery Date Logic

**Automatic Calculation:**

**Rule: 4 AM Cutoff**

**Scenario A: Order Before 4 AM**
- Order Time: 2:30 AM
- Delivery Date: Same day
- Example: Order on June 15 at 2 AM → Deliver June 15

**Scenario B: Order After 4 AM**
- Order Time: 10:00 AM
- Delivery Date: Next day
- Example: Order on June 15 at 10 AM → Deliver June 16

**Admin Override:**
- Admin can change delivery date anytime
- No restrictions
- Customer notified via WhatsApp

**Display:**
- Shown during checkout
- Visible on order details
- Highlighted on order card

### 5.4 Delivery Options

**Two Types:**

**1. Pickup**
- Customer collects from Divine Cakery
- No delivery charge (₹0.00)
- No address needed
- Selected during checkout

**2. Delivery**
- Divine Cakery delivers to address
- Delivery charge applied (as per settings)
- Address required and confirmed
- Selected during checkout

**Changing Option:**
- Select during checkout before payment
- Cannot change after order placed
- Contact admin to modify

---

## 6. Common Workflows

### 6.1 Customer: First Order

**Complete Flow:**

1. **Register Account**
   - Fill registration form
   - Submit
   - WhatsApp sent to admin
   - Wait for approval

2. **Receive Approval**
   - Get WhatsApp from Divine Cakery
   - Account approved

3. **Login**
   - Enter credentials
   - Access app

4. **Browse Products**
   - View product catalog
   - Search for items

5. **Add to Favorites** (Optional)
   - Tap heart on frequently ordered items
   - Quick access later

6. **Add Items to Cart**
   - Set quantity
   - Tap "Add to Cart"
   - Repeat for all items

7. **Proceed to Checkout**
   - Tap "Place Order"
   - Choose Pickup or Delivery
   - Apply discount (if available)
   - Review order summary

8. **Make Payment**
   - Select payment method
   - Complete payment
   - Confirmation received

9. **Order Placed**
   - WhatsApp confirmation opens
   - Send to Divine Cakery
   - View in Orders tab

10. **Track Order**
    - Check status updates
    - Wait for confirmation
    - Receive on delivery date

### 6.2 Customer: Repeat Order

**Quick Reorder Flow:**

1. **Login to App**
2. **Go to Favorites**
   - All frequent items saved
3. **Add to Cart**
   - Tap "Add to Cart" on each favorite
   - Or go to Products and add
4. **Checkout**
   - Review cart
   - Same address/delivery option
   - Apply discount
5. **Pay & Confirm**
   - Select payment method
   - Complete payment
6. **Order Placed**
   - Faster than first time
   - Same great service

**Time Saved:** ~50% faster than browsing products

### 6.3 Admin: Daily Operations

**Morning Routine:**

1. **Login to Admin Panel**

2. **Check Dashboard**
   - View today's pending orders
   - Check pending approvals
   - Review revenue stats

3. **Approve New Customers**
   - Open "Pending Approvals"
   - Review each registration
   - Approve or reject
   - Send WhatsApp notifications

4. **Confirm Orders**
   - Open "Manage Orders"
   - Filter by today's delivery date
   - Review each order
   - Tap "Confirm"
   - Send WhatsApp confirmations

5. **Check Daily Items Report**
   - Go to Reports
   - View today's items
   - Plan production accordingly

6. **Process Orders**
   - Prepare orders
   - Pack and dispatch
   - Update delivery status (if implemented)

**Evening Review:**

7. **Check Today's Revenue**
   - Dashboard shows today's total
   - Compare with previous days

8. **Review Any Issues**
   - Check for cancelled orders
   - Follow up on pending orders

9. **Prepare for Tomorrow**
   - Check tomorrow's orders
   - Plan inventory

### 6.4 Admin: Managing Discounts

**Creating Discount for Loyal Customer:**

1. **Navigate to Manage Discounts**
2. **Tap "Add Discount"**
3. **Select Customer**
   - Choose from dropdown
4. **Set Discount Type**
   - Percentage: 10%
   - Or Fixed: ₹100
5. **Set Valid Period**
   - From: June 1, 2025
   - Until: June 30, 2025
6. **Save Discount**
7. **Customer Notified** (optional manual WhatsApp)
8. **Discount Active**
   - Automatically applies during checkout
   - Customer sees discount in cart

**Seasonal Discount:**
- Create same discount for multiple customers
- Set validity period
- Expires automatically

### 6.5 Admin: Handling Order Issues

**Scenario: Customer Needs Delivery Date Changed**

1. **Customer contacts via WhatsApp**
2. **Admin opens Manage Orders**
3. **Find customer's order**
4. **Tap "Edit" next to delivery date**
5. **Select new date**
6. **Confirm change**
7. **WhatsApp opens automatically**
8. **Send notification to customer**
9. **Customer informed**

**Scenario: Wrong Customer Address**

1. **Admin opens Manage Orders**
2. **Locate order**
3. **Tap "Edit" in customer section**
4. **Update address**
5. **Save changes**
6. **Address updated in customer profile**
7. **Future orders use new address**
8. **Inform customer via WhatsApp**

### 6.6 Customer: Managing Favorites

**Building Your Favorites List:**

1. **Browse Products**
2. **For Each Regular Item:**
   - Tap heart icon ♡
   - Turns red ❤️
   - Added to favorites
3. **Repeat** for 10-15 common items
4. **Go to Favorites Tab**
5. **See All Saved Products**

**Weekly Ordering from Favorites:**

1. **Open Favorites Tab**
2. **Review Your List**
3. **Add Items to Cart**
   - Adjust quantities
   - Tap "Add to Cart"
4. **Add Any Extra Items**
   - Go to Products tab
   - Add seasonal/special items
5. **Checkout as Usual**

**Managing Favorites:**
- Add new products anytime
- Remove products you no longer need
- Updates across all pages instantly

---

## 7. Troubleshooting

### 7.1 Login Issues

**Problem: "Incorrect username or password"**

**Solution:**
1. Check username spelling (case-sensitive)
2. Check password (no extra spaces)
3. Ensure Caps Lock is off
4. Try re-typing password
5. Contact admin if issue persists

**Problem: "Account pending approval"**

**Solution:**
1. Wait for admin approval (up to 24 hours)
2. Check WhatsApp for approval message
3. Contact Divine Cakery if urgent
4. Do not create duplicate accounts

**Problem: "Cannot connect to server"**

**Solution:**
1. Check internet connection
2. Try switching between WiFi/Mobile data
3. Close and reopen app
4. Check if app is up to date
5. Contact support if persists

### 7.2 Order Issues

**Problem: Discount not applying**

**Solution:**
1. Check if discount is active
2. Verify discount validity dates
3. Ensure only one discount per order
4. Contact admin to verify discount
5. Admin may need to recreate discount

**Problem: Cannot complete payment**

**Solution:**

**For UPI:**
1. Ensure UPI app is installed
2. Check UPI PIN is correct
3. Verify bank account is active
4. Try different UPI app

**For Razorpay:**
1. Check card/bank details
2. Ensure sufficient balance
3. Try different payment method
4. Contact Razorpay support if needed

**For Wallet:**
1. Check wallet balance
2. Top-up wallet if insufficient
3. Contact admin for wallet issues

**Problem: Order shows wrong delivery date**

**Solution:**
1. Note the current time and order time
2. Remember 4 AM cutoff rule
3. If incorrect, contact admin
4. Admin can change delivery date
5. You'll receive WhatsApp notification

**Problem: Cannot see my order**

**Solution:**
1. Refresh Orders page (pull down)
2. Check all dates (use date filter)
3. Verify payment was successful
4. Check if order was cancelled
5. Contact admin with order number

### 7.3 App Performance Issues

**Problem: App is slow**

**Solution:**
1. Close other apps
2. Free up phone memory
3. Clear app cache (in phone settings)
4. Check internet speed
5. Restart phone
6. Reinstall app if needed

**Problem: Images not loading**

**Solution:**
1. Check internet connection
2. Wait a few seconds for loading
3. Refresh the page
4. Switch between WiFi/Mobile data
5. Clear app cache

**Problem: App crashes**

**Solution:**
1. Force close app
2. Reopen app
3. Update to latest version
4. Restart phone
5. Reinstall app
6. Report issue to Divine Cakery

### 7.4 Payment Issues

**Problem: Payment deducted but order not placed**

**Solution:**
1. **Do not panic**
2. Check Orders tab for order
3. Check payment method transaction history
4. Screenshot transaction details
5. Contact Divine Cakery immediately with:
   - Transaction ID
   - Amount
   - Date/Time
   - Screenshot
6. Admin will verify and assist
7. Refund or order creation as appropriate

**Problem: Wallet balance not updated after top-up**

**Solution:**
1. Wait 2-3 minutes for processing
2. Refresh Wallet page
3. Check payment status
4. Verify payment was successful
5. Contact admin with payment proof
6. Admin will manually update balance

### 7.5 Account Issues

**Problem: Forgot password**

**Solution:**
1. Contact Divine Cakery via WhatsApp
2. Verify your identity (username, phone, business name)
3. Admin will reset password
4. You'll receive new password
5. Login and change password

**Problem: Cannot register - "Username already exists"**

**Solution:**
1. Try different username
2. If you registered before, try login
3. If forgot password, contact admin
4. Do not create duplicate accounts

**Problem: Phone number change**

**Solution:**
1. Login to app
2. Contact admin via WhatsApp
3. Provide new phone number
4. Admin updates in your profile
5. Future notifications to new number

### 7.6 Contact Support

**When to Contact:**
- Cannot resolve issue yourself
- Payment problems
- Account issues
- Order not received
- App bugs or crashes

**How to Contact:**

**Method 1: In-App Contact**
1. Tap "Contact Us" button (chat icon)
2. WhatsApp opens
3. Describe issue
4. Send message

**Method 2: Direct WhatsApp**
1. Open WhatsApp
2. Search for Divine Cakery number
3. Send message

**Information to Provide:**
- Your name and username
- Issue description
- Screenshots (if applicable)
- Order number (if order-related)
- Transaction ID (if payment-related)
- Steps you've already tried

**Response Time:**
- Typically within 2-4 hours
- Urgent issues prioritized
- 24/7 WhatsApp support

---

## 8. FAQ

### 8.1 General Questions

**Q: Is there a minimum order value?**
A: Check with Divine Cakery for current minimum order policy.

**Q: What are the delivery charges?**
A: Delivery charges are displayed during checkout. They may vary. Pickup orders have no charge.

**Q: Can I order for same-day delivery?**
A: Yes, if you order before 4 AM. Orders after 4 AM are delivered next day.

**Q: What payment methods do you accept?**
A: UPI, Razorpay (cards, net banking, wallets), and Wallet.

**Q: Is my payment information secure?**
A: Yes, we use secure payment gateways (Razorpay) with encryption. We do not store card details.

**Q: Can I cancel my order?**
A: Contact admin immediately. Orders cannot be self-cancelled in the app currently.

**Q: How do I track my order?**
A: View order status in Orders tab. Admin updates status when order is confirmed.

**Q: What if a product is out of stock?**
A: Contact admin via WhatsApp. They will inform you of availability.

### 8.2 Customer Questions

**Q: How long does account approval take?**
A: Typically within 24 hours, often much faster.

**Q: Can I change my delivery address?**
A: Yes, contact admin or update in profile. Admin can update for current orders.

**Q: How do I add money to my wallet?**
A: If top-up is enabled for your account, use the top-up option in Wallet tab. Otherwise, contact admin.

**Q: Can I get a discount?**
A: Discounts are provided by admin. Contact admin to inquire about eligibility.

**Q: How do I save time on repeat orders?**
A: Use the Favorites feature. Save frequently ordered items for quick access.

**Q: Can I order in bulk?**
A: Yes, this app is designed for wholesale orders. Add quantities as needed.

**Q: What if I receive wrong items?**
A: Contact admin immediately with order number and issue details. They will resolve.

**Q: Can I see order history from last month?**
A: Yes, scroll in Orders tab to see all past orders.

### 8.3 Admin Questions

**Q: Can I have multiple admin accounts?**
A: Yes, create additional admin accounts in Manage Users with appropriate access levels.

**Q: How do I create different admin access levels?**
A: When creating admin user, select access level: Full, Orders Only, or Reports Only.

**Q: Can I edit product prices anytime?**
A: Yes, edit products in Manage Products. Changes reflect immediately for customers.

**Q: How do I remove a customer?**
A: Currently not directly deletable. Deactivate account or contact system admin.

**Q: Can I see which products are selling most?**
A: Yes, use Daily Items Report in Reports section.

**Q: How do I backup data?**
A: Database backups should be automated. Contact system admin for manual backups.

**Q: Can I export reports?**
A: Currently view-only. Future updates may include export functionality.

**Q: How do I change admin password?**
A: Go to Profile, change password option (if implemented), or contact system admin.

### 8.4 Technical Questions

**Q: What devices are supported?**
A: Android 6.0+, iOS 12.0+, and web browsers (Chrome, Safari, Firefox).

**Q: Do I need internet to use the app?**
A: Yes, active internet required for all features.

**Q: How much data does the app use?**
A: Minimal data usage. Product images consume most data. Use WiFi for initial browse.

**Q: Can I use the app on multiple devices?**
A: Yes, login on any device with your credentials.

**Q: Is the app available on Play Store / App Store?**
A: Check current availability. May be available via Expo Go or direct install.

**Q: How do I update the app?**
A: Auto-updates if published. Or download latest version from provided link.

**Q: What browsers are supported for web version?**
A: Chrome, Safari, Firefox, Edge (latest versions recommended).

**Q: Can I use the app offline?**
A: No, all features require internet connection.

---

## 9. Appendix

### 9.1 Glossary

**Terms & Definitions:**

- **Admin:** User with administrative privileges to manage products, orders, users
- **Cart:** Shopping cart where items are added before checkout
- **Checkout:** Process of reviewing order and making payment
- **Discount:** Reduction in price offered by admin to specific customers
- **Favorites:** List of saved products for quick reordering
- **Order Number:** Unique identifier for each order (format: YYMMDDXXXX)
- **Pending Approval:** Status of new customer account awaiting admin review
- **Pickup:** Order collection method where customer collects from Divine Cakery
- **Delivery:** Order fulfillment method where Divine Cakery delivers to address
- **UPI:** Unified Payments Interface - instant payment system
- **Razorpay:** Payment gateway for online transactions
- **Wallet:** Digital wallet within app for storing credits
- **WhatsApp Integration:** Automatic opening of WhatsApp for notifications

### 9.2 Contact Information

**Divine Cakery Support:**

**WhatsApp:** [Divine Cakery WhatsApp Number]

**Support Hours:** 24/7 via WhatsApp

**Response Time:** 2-4 hours (typically faster)

**For Technical Issues:**
- App bugs
- Payment problems
- Account access

**For Business Inquiries:**
- Bulk orders
- Custom products
- Partnership opportunities

### 9.3 Version History

**Version 1.0.0 (June 2025)**
- Initial release
- Customer registration with approval workflow
- Product catalog with images
- Favorites system
- Shopping cart and checkout
- Multiple payment methods (UPI, Razorpay, Wallet)
- Order tracking
- Admin dashboard
- Product management with image upload
- Order management with status updates
- User management
- Reports (daily revenue, items sold)
- Discount management
- Delivery settings
- WhatsApp integration
- Order number format (YYMMDDXXXX)
- Delivery date override
- Customer details editing from orders
- Contact Us button

### 9.4 Credits

**Developed By:** Emergent AI Platform

**Technology Stack:**
- Frontend: React Native with Expo
- Backend: FastAPI (Python)
- Database: MongoDB
- Payment: Razorpay Integration
- Notifications: WhatsApp Integration

**For:** Divine Cakery Wholesale Bakery

---

## Document Information

**Document Version:** 1.0  
**Last Updated:** June 2025  
**Prepared For:** Divine Cakery Customers & Administrators  
**Prepared By:** Divine Cakery Team  

---

**For the latest updates and support, contact Divine Cakery via WhatsApp.**

**Thank you for using Divine Cakery App!** 🎂

---

*End of User Manual*
