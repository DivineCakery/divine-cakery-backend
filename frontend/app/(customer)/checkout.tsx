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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useCartStore, useAuthStore } from '../../store';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, getTotalAmount, clearCart } = useCartStore();
  const { user, refreshUser } = useAuthStore();
  const [wallet, setWallet] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'upi'>('wallet');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const totalAmount = getTotalAmount();

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const data = await apiService.getWallet();
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter delivery address');
      return;
    }

    if (paymentMethod === 'wallet' && wallet.balance < totalAmount) {
      Alert.alert('Insufficient Balance', 'Please add money to wallet or choose UPI payment');
      return;
    }

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
        total_amount: totalAmount,
        payment_method: paymentMethod,
        delivery_address: deliveryAddress,
        notes: notes || undefined,
      };

      if (paymentMethod === 'upi') {
        Alert.alert(
          'UPI Payment',
          `Pay ₹${totalAmount.toFixed(2)} via UPI?\\n\\nNote: Razorpay integration will be added when credentials are provided.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setPlacing(false) },
            {
              text: 'Simulate Payment',
              onPress: async () => {
                try {
                  // Mock UPI payment success
                  Alert.alert('Payment Simulated', 'Order will be placed with mocked payment');
                  
                  // Place order
                  await apiService.createOrder(orderData);
                  
                  clearCart();
                  await refreshUser();
                  
                  Alert.alert('Success', 'Order placed successfully!', [
                    { text: 'OK', onPress: () => router.replace('/(customer)/orders') },
                  ]);
                } catch (error: any) {
                  Alert.alert('Error', error.response?.data?.detail || 'Failed to place order');
                } finally {
                  setPlacing(false);
                }
              },
            },
          ]
        );
      } else {
        // Wallet payment
        await apiService.createOrder(orderData);
        
        clearCart();
        await refreshUser();
        
        Alert.alert('Success', 'Order placed successfully!', [
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
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.card}>
          {items.map((item) => (
            <View key={item.product_id} style={styles.orderItem}>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <Text style={styles.itemDetails}>
                {item.quantity} x ₹{item.price.toFixed(2)} = ₹{item.subtotal.toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Notes (Optional)</Text>
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
        <Text style={styles.sectionTitle}>Payment Method</Text>
        
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
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#8B4513',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  addressInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
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
    paddingBottom: 30,
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
