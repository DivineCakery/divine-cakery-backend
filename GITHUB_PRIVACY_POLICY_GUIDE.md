# Upload Privacy Policy to GitHub Pages - Step by Step Guide

## What You'll Get
A public URL like: `https://yourusername.github.io/divine-cakery-privacy/divine-cakery-privacy-policy.html`

---

## Step 1: Create a New Repository

1. **Go to GitHub:** https://github.com
2. **Login** to your account
3. **Click the "+" icon** (top right corner) → Select **"New repository"**

4. **Fill in repository details:**
   - **Repository name:** `divine-cakery-privacy`
   - **Description:** `Privacy policy for Divine Cakery mobile app`
   - **Public/Private:** Choose **Public** ✓ (required for GitHub Pages)
   - **Initialize repository:** 
     * ✓ Check "Add a README file" (makes it easier)
   - **Click "Create repository"**

---

## Step 2: Upload the Privacy Policy File

### Option A: Using GitHub Web Interface (Easiest)

1. **You're now in your new repository**
2. **Click "Add file"** button → Select **"Upload files"**
3. **Drag and drop** the privacy policy file OR click "choose your files"
   - File location on your computer: Download from `/app/divine-cakery-privacy-policy.html`
4. **Important:** Rename the file to `index.html` (this makes the URL cleaner)
   - OR keep it as `divine-cakery-privacy-policy.html`
5. **Add commit message:** `Add privacy policy`
6. **Click "Commit changes"**

### Option B: Using Git Command Line

If you prefer command line:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/divine-cakery-privacy.git
cd divine-cakery-privacy

# Copy the privacy policy file
cp /app/divine-cakery-privacy-policy.html ./index.html

# Commit and push
git add index.html
git commit -m "Add privacy policy"
git push origin main
```

---

## Step 3: Enable GitHub Pages

1. **In your repository,** click **"Settings"** tab (top right)
2. **Scroll down** to find **"Pages"** in the left sidebar
   - Or directly go to: `https://github.com/YOUR_USERNAME/divine-cakery-privacy/settings/pages`

3. **Under "Build and deployment":**
   - **Source:** Select **"Deploy from a branch"**
   - **Branch:** Select **"main"** (or "master")
   - **Folder:** Select **"/ (root)"**
   - **Click "Save"**

4. **Wait 1-2 minutes** for GitHub to deploy your site

5. **Refresh the page** - You'll see a message:
   ```
   Your site is live at https://YOUR_USERNAME.github.io/divine-cakery-privacy/
   ```

---

## Step 4: Get Your Privacy Policy URL

### If you named the file `index.html`:
```
https://YOUR_USERNAME.github.io/divine-cakery-privacy/
```

### If you kept the original name:
```
https://YOUR_USERNAME.github.io/divine-cakery-privacy/divine-cakery-privacy-policy.html
```

**Example:** If your GitHub username is `johndoe`:
```
https://johndoe.github.io/divine-cakery-privacy/
```

---

## Step 5: Verify It Works

1. **Copy the URL** from GitHub Pages settings
2. **Open it in a new browser tab**
3. **Check that your privacy policy loads correctly**
4. **Share this URL** - anyone can access it without login

---

## Troubleshooting

### Issue: "404 - Page not found"
**Solution:**
- Wait 2-3 minutes after enabling Pages
- Check file is named correctly (`index.html` or the full name)
- Verify repository is set to "Public"
- Check the branch name is correct (main/master)

### Issue: "Pages settings not showing"
**Solution:**
- Ensure repository is Public
- Refresh the Settings page
- Try accessing directly: `github.com/USERNAME/REPO/settings/pages`

### Issue: "Content not updating"
**Solution:**
- Wait 1-2 minutes for GitHub to rebuild
- Clear browser cache (Ctrl+Shift+R)
- Check you committed to the correct branch

---

## Alternative: Convert to Proper HTML

Your current file is markdown format (`.html` extension but markdown content). 

### Option: Convert to Clean HTML

Create a new file `index.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Divine Cakery - Privacy Policy</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #8B4513;
            border-bottom: 2px solid #8B4513;
            padding-bottom: 10px;
        }
        h2 {
            color: #8B4513;
            margin-top: 30px;
        }
        h3 {
            color: #666;
        }
        ul {
            padding-left: 20px;
        }
        .last-updated {
            color: #666;
            font-style: italic;
        }
    </style>
</head>
<body>
    <h1>Privacy Policy for Divine Cakery</h1>
    <p class="last-updated"><strong>Last Updated:</strong> November 4, 2024</p>

    <p>Divine Cakery ("we," "our," or "us") operates the Divine Cakery mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App.</p>

    <h2>1. Information We Collect</h2>

    <h3>1.1 Personal Information</h3>
    <p>When you register for and use our App, we may collect the following personal information:</p>
    <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Delivery address</li>
        <li>Payment information (processed securely through Razorpay)</li>
    </ul>

    <h3>1.2 Order Information</h3>
    <ul>
        <li>Products ordered</li>
        <li>Order history</li>
        <li>Delivery preferences</li>
        <li>Order notes and special instructions</li>
    </ul>

    <h3>1.3 Usage Information</h3>
    <ul>
        <li>Device information (device type, operating system)</li>
        <li>App usage data</li>
        <li>Log information</li>
    </ul>

    <h3>1.4 Location Information</h3>
    <ul>
        <li>Delivery location for order fulfillment</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>We use the information we collect to:</p>
    <ul>
        <li>Process and fulfill your orders</li>
        <li>Communicate with you about your orders via WhatsApp and email</li>
        <li>Send order confirmations and delivery updates</li>
        <li>Process payments securely</li>
        <li>Provide customer support</li>
        <li>Improve our products and services</li>
        <li>Comply with legal obligations</li>
    </ul>

    <h2>3. Information Sharing and Disclosure</h2>
    <p>We do <strong>NOT</strong> sell, trade, or rent your personal information to third parties.</p>
    <p>We may share your information with:</p>
    <ul>
        <li><strong>Payment Processors:</strong> Razorpay for processing payments securely</li>
        <li><strong>Communication Services:</strong> WhatsApp for order notifications (with your consent)</li>
        <li><strong>Delivery Services:</strong> To fulfill your orders</li>
        <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
    </ul>

    <h2>4. Data Security</h2>
    <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.</p>

    <h2>5. Data Retention</h2>
    <p>We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.</p>

    <h2>6. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
        <li>Access your personal information</li>
        <li>Correct inaccurate information</li>
        <li>Request deletion of your information</li>
        <li>Object to processing of your information</li>
        <li>Request data portability</li>
    </ul>

    <h2>7. Children's Privacy</h2>
    <p>Our App is not intended for children under 18. We do not knowingly collect personal information from children under 18.</p>

    <h2>8. Third-Party Services</h2>
    <p>Our App uses the following third-party services:</p>
    <ul>
        <li><strong>Razorpay:</strong> Payment processing</li>
        <li><strong>WhatsApp:</strong> Order notifications and customer support</li>
    </ul>
    <p>These services have their own privacy policies. We recommend reviewing them.</p>

    <h2>9. Changes to This Privacy Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>

    <h2>10. Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please contact us:</p>
    <ul>
        <li><strong>Email:</strong> contact@divinecakery.in</li>
        <li><strong>Phone:</strong> +91 9544183334</li>
        <li><strong>Address:</strong> Thiruvananthapuram, Kerala, India</li>
    </ul>

    <h2>11. Consent</h2>
    <p>By using our App, you consent to our Privacy Policy and agree to its terms.</p>

    <hr>
    <p style="text-align: center; color: #666; margin-top: 40px;">
        © 2024 Divine Cakery. All rights reserved.
    </p>
</body>
</html>
```

Upload this HTML file instead for a better-formatted privacy policy.

---

## Quick Summary

**Steps:**
1. Create repository: `divine-cakery-privacy` (Public)
2. Upload file as `index.html`
3. Enable GitHub Pages (Settings → Pages)
4. Get URL: `https://USERNAME.github.io/divine-cakery-privacy/`
5. Use this URL in Play Console

**Time Required:** 5-10 minutes

**Cost:** FREE ✓

---

## Next Step After Getting URL

Once you have your privacy policy URL:
1. Copy the full URL
2. Go to Google Play Console
3. Paste it in the "Privacy Policy" field under "Store Presence → Pricing & Distribution"
4. Save

That's it! Your privacy policy is now publicly hosted and ready for Google Play Store submission.

Let me know your GitHub username and I can provide the exact URL format you'll get!
