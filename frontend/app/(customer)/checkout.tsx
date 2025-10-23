import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import apiService from '../../services/api';
import { useCartStore, useAuthStore } from '../../store';
import { DIVINE_WHATSAPP_NUMBER, getOrderConfirmationMessage, DIVINE_WHATSAPP_CUSTOMER_SUPPORT } from '../../constants/whatsapp';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, getTotalAmount, clearCart } = useCartStore();
  const { user, refreshUser } = useAuthStore();
  const [wallet, setWallet] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'upi'>('wallet');
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [discount, setDiscount] = useState<any>(null);

  const subtotal = getTotalAmount();
  const appliedDeliveryCharge = orderType === 'delivery' ? deliveryCharge : 0;
  const discountAmount = discount?.has_discount 
    ? (discount.discount.discount_type === 'percentage' 
        ? (subtotal * discount.discount.discount_value) / 100 
        : discount.discount.discount_value)
    : 0;
  const totalAmount = subtotal + appliedDeliveryCharge - discountAmount;

  // Calculate delivery date based on order time
  // Orders before 4 AM: same day delivery
  // Orders after 4 AM: next day delivery
  const getDeliveryDate = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    const deliveryDate = new Date(now);
    
    // If order is placed after 4 AM, add 1 day
    if (currentHour >= 4) {
      deliveryDate.setDate(now.getDate() + 1);
    }
    // If before 4 AM, delivery is same day (no change needed)
    
    return deliveryDate.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  useEffect(() => {
    fetchWallet();
    fetchDeliveryCharge();
    fetchCustomerDiscount();
  }, []);

  // Refresh wallet balance when screen gains focus (real-time update)
  useFocusEffect(
    React.useCallback(() => {
      console.log('Checkout screen focused - refreshing wallet');
      fetchWallet();
      refreshUser(); // Update user data in store including wallet balance
    }, [])
  );

  const fetchWallet = async () => {
    try {
      const data = await apiService.getWallet();
      console.log('Wallet fetched in checkout:', data);
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryCharge = async () => {
    try {
      const data = await apiService.getDeliveryCharge();
      setDeliveryCharge(data.delivery_charge || 0);
    } catch (error) {
      console.error('Error fetching delivery charge:', error);
    }
  };

  const fetchCustomerDiscount = async () => {
    try {
      if (user?.id) {
        const data = await apiService.getCustomerDiscount(user.id);
        setDiscount(data);
      }
    } catch (error) {
      console.error('Error fetching discount:', error);
    }
  };

  const sendWhatsAppMessage = async (orderId: string) => {
    try {
      const message = getOrderConfirmationMessage(orderId, getDeliveryDate());
      const whatsappUrl = `whatsapp://send?phone=${DIVINE_WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('WhatsApp not installed', 'Please install WhatsApp to receive order confirmation');
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
    }
  };

  const handleContactUs = () => {
    Alert.alert(
      'Contact Divine Cakery',
      'Please leave us a message if phone is unanswered. We will respond as soon as possible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open WhatsApp',
          onPress: async () => {
            try {
              const whatsappUrl = `whatsapp://send?phone=${DIVINE_WHATSAPP_CUSTOMER_SUPPORT}`;
              const canOpen = await Linking.canOpenURL(whatsappUrl);
              if (canOpen) {
                await Linking.openURL(whatsappUrl);
              } else {
                const webUrl = `https://wa.me/${DIVINE_WHATSAPP_CUSTOMER_SUPPORT}`;
                await Linking.openURL(webUrl);
              }
            } catch (error) {
              Alert.alert('Error', 'Could not open WhatsApp');
            }
          },
        },
      ]
    );
  };

  const handlePlaceOrder = async () => {
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter delivery address');
      return;
    }

    if (paymentMethod === 'wallet' && wallet.balance < totalAmount) {
      Alert.alert('Insufficient Balance', 'Please add money to wallet or choose UPI payment');
      return;
    }

    // Check for delivery notes
    try {
      const deliveryNotesData = await apiService.getCustomerDeliveryNotes();
      
      if (deliveryNotesData.enabled && deliveryNotesData.message) {
        // Show delivery notes popup
        Alert.alert(
          'Special Delivery Note',
          deliveryNotesData.message,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue Order', onPress: () => proceedWithOrder() }
          ]
        );
      } else {
        // No delivery notes, proceed directly
        await proceedWithOrder();
      }
    } catch (error) {
      console.error('Error fetching delivery notes:', error);
      // If error, proceed without notes
      await proceedWithOrder();
    }
  };

  const proceedWithOrder = async () => {
    setPlacing(true);
    try {
      const orderData = {
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
        subtotal: subtotal,
        delivery_charge: appliedDeliveryCharge,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? deliveryAddress : undefined,
        notes: notes || undefined,
      };

      if (paymentMethod === 'upi') {
        // UPI/Razorpay payment
        const paymentData = await apiService.createPaymentOrder(totalAmount);
        
        if (!paymentData.payment_link_url) {
          throw new Error('Failed to create payment link');
        }
        
        // Open Razorpay payment link in browser
        const result = await WebBrowser.openBrowserAsync(paymentData.payment_link_url);
        
        if (result.type === 'cancel' || result.type === 'dismiss') {
          Alert.alert('Payment Cancelled', 'Payment was cancelled. Order not placed.');
          setPlacing(false);
          return;
        }

        // After payment completion, create the order
        Alert.alert(
          'Payment Verification',
          'Did you complete the payment successfully?',
          [
            {
              text: 'Yes, Place Order',
              onPress: async () => {
                try {
                  const response = await apiService.createOrder(orderData);
                  clearCart();
                  await refreshUser();
                  Alert.alert('Success', 'Order placed successfully! You will receive a confirmation soon.', [
                    { text: 'OK', onPress: () => router.replace('/(customer)/orders') },
                  ]);
                } catch (error: any) {
                  Alert.alert('Error', error.response?.data?.detail || 'Failed to place order');
                }
                setPlacing(false);
              }
            },
            {
              text: 'No, Cancel',
              style: 'cancel',
              onPress: () => setPlacing(false)
            }
          ]
        );
      } else {
        // Wallet payment
        const response = await apiService.createOrder(orderData);
        
        clearCart();
        await refreshUser();
        
        Alert.alert('Success', 'Order placed successfully! You will receive a confirmation soon.', [
          { text: 'OK', onPress: () => router.replace('/(customer)/orders') },
        ]);
        setPlacing(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to place order');
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <TouchableOpacity onPress={handleContactUs} style={styles.contactButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          {items.map((item) => (
            <View key={item.product_id} style={styles.orderItem}>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <Text style={styles.itemDetails}>
                {item.quantity} x ₹{item.price.toFixed(2)} = ₹{item.subtotal.toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal:</Text>
            <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          {orderType === 'delivery' && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Charge:</Text>
              <Text style={styles.priceValue}>₹{appliedDeliveryCharge.toFixed(2)}</Text>
            </View>
          )}
          {discount?.has_discount && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, styles.discountText]}>
                Discount ({discount.discount.discount_type === 'percentage' 
                  ? `${discount.discount.discount_value}%` 
                  : `₹${discount.discount.discount_value}`}):
              </Text>
              <Text style={[styles.priceValue, styles.discountText]}>-₹{discountAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.orderTypeContainer}>
          <TouchableOpacity
            style={[styles.orderTypeButton, orderType === 'delivery' && styles.orderTypeButtonActive]}
            onPress={() => setOrderType('delivery')}
          >
            <Ionicons 
              name="bicycle" 
              size={20} 
              color={orderType === 'delivery' ? '#fff' : '#8B4513'} 
            />
            <Text style={[styles.orderTypeText, orderType === 'delivery' && styles.orderTypeTextActive]}>
              Delivery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.orderTypeButton, orderType === 'pickup' && styles.orderTypeButtonActive]}
            onPress={() => setOrderType('pickup')}
          >
            <Ionicons 
              name="basket" 
              size={20} 
              color={orderType === 'pickup' ? '#fff' : '#8B4513'} 
            />
            <Text style={[styles.orderTypeText, orderType === 'pickup' && styles.orderTypeTextActive]}>
              Pickup
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {orderType === 'delivery' && (
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.deliveryInfo}>
              <Ionicons name="calendar" size={20} color="#8B4513" />
              <Text style={styles.deliveryText}>{getDeliveryDate()}</Text>
            </View>
          </View>
        </View>
      )}

      {orderType === 'delivery' && (
        <View style={styles.section}>
          <View style={styles.card}>
            <TextInput
              style={styles.addressInput}
              placeholder="Enter delivery address"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.card}>
          <TextInput
            style={styles.notesInput}
            placeholder="Special instructions..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'wallet' && styles.paymentOptionActive,
          ]}
          onPress={() => setPaymentMethod('wallet')}
        >
          <View style={styles.paymentOptionContent}>
            <Ionicons
              name={paymentMethod === 'wallet' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={paymentMethod === 'wallet' ? '#8B4513' : '#999'}
            />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Wallet</Text>
              <Text style={styles.paymentBalance}>
                Balance: ₹{wallet?.balance?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
          {wallet && wallet.balance < totalAmount && (
            <Text style={styles.insufficientText}>Insufficient balance</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'upi' && styles.paymentOptionActive,
          ]}
          onPress={() => setPaymentMethod('upi')}
        >
          <View style={styles.paymentOptionContent}>
            <Ionicons
              name={paymentMethod === 'upi' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={paymentMethod === 'upi' ? '#8B4513' : '#999'}
            />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>UPI Payment</Text>
              <Text style={styles.paymentSubtext}>Google Pay, PhonePe, Paytm, etc.</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, placing && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderButtonText}>
                Place Order - ₹{totalAmount.toFixed(2)}
              </Text>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
  },
  header: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  contactButton: {
    padding: 6,
  },
  section: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  deliveryDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deliveryDateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  deliveryDateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  deliveryDateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  orderItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
  },
  priceValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  discountText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#8B4513',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  addressInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  orderTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  orderTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#8B4513',
  },
  orderTypeButtonActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  orderTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  orderTypeTextActive: {
    color: '#fff',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deliveryText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  notesInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  paymentOption: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paymentOptionActive: {
    borderColor: '#8B4513',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentInfo: {
    marginLeft: 15,
    flex: 1,
  },
  paymentLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentBalance: {
    fontSize: 14,
    color: '#8B4513',
    marginTop: 2,
  },
  paymentSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  insufficientText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 5,
    marginLeft: 39,
  },
  footer: {
    padding: 15,
    paddingBottom: 100,
  },
  placeOrderButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#999',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});
