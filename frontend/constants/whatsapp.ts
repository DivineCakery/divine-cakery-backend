// Divine Cakery WhatsApp Business Number
// Format: country code + number (no + or spaces)
export const DIVINE_WHATSAPP_NUMBER = '919544183334';

// WhatsApp message templates
export const getOrderConfirmationMessage = (orderId: string, deliveryDate: string) => {
  return `Hello! Your order #${orderId} has been placed successfully with Divine Cakery. Expected delivery: ${deliveryDate}. Thank you for your order!`;
};

export const getAdminOrderNotification = (orderId: string) => {
  return `Thank you for the order #${orderId}. We will despatch it soon!`;
};
