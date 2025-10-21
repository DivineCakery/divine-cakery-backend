// Divine Cakery WhatsApp Business Numbers
// Format: country code + number (no + or spaces)
export const DIVINE_WHATSAPP_NUMBER = '918075946225'; // Main business number for order confirmations
export const DIVINE_WHATSAPP_CUSTOMER_SUPPORT = '919544183334'; // Customer support number

// WhatsApp message templates
export const getOrderConfirmationMessage = (orderId: string, deliveryDate: string) => {
  return `Hello! Your order #${orderId} has been placed successfully with Divine Cakery. Expected delivery: ${deliveryDate}. Thank you for your order!`;
};

export const getAdminOrderNotification = (orderId: string) => {
  return `Thank you for the order #${orderId}. We will despatch it soon!`;
};
