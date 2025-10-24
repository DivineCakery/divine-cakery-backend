// Divine Cakery WhatsApp Business Numbers
// Format: country code + number (no + or spaces)
export const DIVINE_WHATSAPP_NUMBER = '918075946225'; // Main business number for order confirmations
export const DIVINE_WHATSAPP_CUSTOMER_SUPPORT = '919544183334'; // Customer support number
export const DIVINE_WHATSAPP_ADMIN_ALERT = '919544183334'; // Admin alert number for new registrations

// WhatsApp message templates
export const getOrderConfirmationMessage = (orderId: string, deliveryDate: string) => {
  return `Hello! Your order #${orderId} has been placed successfully with Divine Cakery. Expected delivery: ${deliveryDate}. Thank you for your order!`;
};

export const getAdminOrderNotification = (orderId: string) => {
  return `Thank you for the order #${orderId}. We will despatch it soon!`;
};

export const getNewUserRegistrationAlert = (username: string, businessName: string, phone: string, email: string, address: string) => {
  return `🔔 *New User Registration Alert*\n\nA new user has registered and is waiting for approval:\n\n*Username:* ${username}\n*Business Name:* ${businessName}\n*Phone:* ${phone}\n*Email:* ${email}\n*Address:* ${address}\n\nPlease login to the admin panel to approve this registration request.`;
};
