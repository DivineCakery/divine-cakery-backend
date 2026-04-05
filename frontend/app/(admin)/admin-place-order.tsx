import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '../../services/api';

interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
  is_available?: boolean;
}

interface Customer {
  id: string;
  username: string;
  business_name?: string;
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export default function AdminPlaceOrder() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [pendingBalance, setPendingBalance] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [customerPendingBalance, setCustomerPendingBalance] = useState<number | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date>(() => {
    // Default: use IST-aware logic - before 4AM IST = today, else tomorrow
    const now = new Date();
    // IST offset is +5:30 = 330 minutes
    const istOffsetMs = 330 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs + now.getTimezoneOffset() * 60 * 1000);
    const istHour = istNow.getHours();
    const target = new Date(istNow);
    if (istHour >= 4) {
      target.setDate(target.getDate() + 1);
    }
    target.setHours(0, 0, 0, 0);
    return target;
  });

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [custsData, prodsData] = await Promise.all([
        apiService.getAllUsers(),
        apiService.getProducts(undefined, undefined, true),
      ]);
      const custList = (custsData || []).filter((u: any) => u.role === 'customer');
      setCustomers(custList);
      setProducts(prodsData || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally { setLoading(false); }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
          : i
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price,
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.product_id !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return null as any;
        return { ...i, quantity: newQty, subtotal: newQty * i.price };
      }).filter(Boolean);
    });
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);

  const handlePlaceOrder = async () => {
    if (!selectedCustomer) { showAlert('Error', 'Select a customer'); return; }
    if (cart.length === 0) { showAlert('Error', 'Add at least one item'); return; }

    setSubmitting(true);
    try {
      // Format delivery date as YYYY-MM-DD in IST
      const y = deliveryDate.getFullYear();
      const m = String(deliveryDate.getMonth() + 1).padStart(2, '0');
      const d = String(deliveryDate.getDate()).padStart(2, '0');
      const deliveryDateStr = `${y}-${m}-${d}`;
      
      const result = await apiService.adminPlaceOrder({
        customer_id: selectedCustomer.id,
        items: cart,
        subtotal: cartTotal,
        total_amount: cartTotal,
        notes: notes || undefined,
        delivery_date: deliveryDateStr,
      });
      showAlert('Success', `Order #${result.order_number} placed for ${selectedCustomer.business_name || selectedCustomer.username} (Pay Later)`);
      setCart([]);
      setNotes('');
      // Refresh pending balance since a new order was added
      apiService.getCustomerBalance(selectedCustomer.id).then(b => setCustomerPendingBalance(b.pending_balance)).catch(() => {});
    } catch (e: any) {
      showAlert('Error', e?.response?.data?.detail || 'Failed to place order');
    } finally { setSubmitting(false); }
  };

  const openPaymentModal = async (customer: Customer) => {
    setPaymentCustomer(customer);
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentLoading(true);
    setShowPaymentModal(true);
    try {
      const balance = await apiService.getCustomerBalance(customer.id);
      setPendingBalance(balance.pending_balance);
    } catch { setPendingBalance(0); }
    finally { setPaymentLoading(false); }
  };

  const handleRecordPayment = async () => {
    if (!paymentCustomer) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) { showAlert('Error', 'Enter a valid amount'); return; }

    setPaymentLoading(true);
    try {
      const result = await apiService.adminRecordPayment({
        customer_id: paymentCustomer.id,
        amount: amt,
        notes: paymentNotes || undefined,
      });
      // Refresh pending balance BEFORE showing alert (alert blocks on web)
      try {
        const b = await apiService.getCustomerBalance(paymentCustomer.id);
        setCustomerPendingBalance(b.pending_balance);
        setPendingBalance(b.pending_balance);
      } catch {}
      setShowPaymentModal(false);
      showAlert('Success', result.message);
    } catch (e: any) {
      showAlert('Error', e?.response?.data?.detail || 'Failed to record payment');
    } finally { setPaymentLoading(false); }
  };

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    return (c.business_name || '').toLowerCase().includes(q) || c.username.toLowerCase().includes(q);
  });

  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  if (loading) return <ActivityIndicator size="large" color="#8B4513" style={{ flex: 1, marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Place Order / Record Payment</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Selection */}
        <Text style={styles.sectionLabel}>Select Customer</Text>
        <TouchableOpacity
          style={styles.customerSelector}
          onPress={() => setShowCustomerPicker(true)}
          testID="customer-selector"
        >
          {selectedCustomer ? (
            <View style={styles.selectedCustomerRow}>
              <Ionicons name="person" size={18} color="#8B4513" />
              <Text style={styles.selectedCustomerText}>
                {selectedCustomer.business_name || selectedCustomer.username}
              </Text>
              {customerPendingBalance !== null && customerPendingBalance > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending: Rs.{customerPendingBalance}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => openPaymentModal(selectedCustomer)} style={styles.paymentBadge} testID="record-payment-btn">
                <Ionicons name="card-outline" size={14} color="#fff" />
                <Text style={styles.paymentBadgeText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.placeholderText}>Tap to select a customer...</Text>
          )}
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>

        {/* Delivery Date Picker */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Delivery Date</Text>
        <View style={styles.datePickerRow} testID="delivery-date-picker">
          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => {
              const prev = new Date(deliveryDate);
              prev.setDate(prev.getDate() - 1);
              setDeliveryDate(prev);
            }}
            testID="delivery-date-prev"
          >
            <Ionicons name="chevron-back" size={22} color="#8B4513" />
          </TouchableOpacity>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateDayName}>
              {deliveryDate.toLocaleDateString('en-IN', { weekday: 'long' })}
            </Text>
            <Text style={styles.dateText} testID="delivery-date-value">
              {deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => {
              const next = new Date(deliveryDate);
              next.setDate(next.getDate() + 1);
              setDeliveryDate(next);
            }}
            testID="delivery-date-next"
          >
            <Ionicons name="chevron-forward" size={22} color="#8B4513" />
          </TouchableOpacity>
        </View>

        {/* Product Search & List */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Add Products</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={productSearch}
          onChangeText={setProductSearch}
          testID="product-search"
        />
        <View style={styles.productGrid}>
          {filteredProducts.slice(0, 50).map(p => {
            const inCart = cart.find(c => c.product_id === p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.productCard, inCart && styles.productCardActive]}
                onPress={() => addToCart(p)}
              >
                <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.productPrice}>Rs.{p.price}</Text>
                {inCart && (
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{inCart.quantity}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cart */}
        {cart.length > 0 && (
          <View style={styles.cartSection}>
            <Text style={styles.sectionLabel}>Order Summary</Text>
            {cart.map(item => (
              <View key={item.product_id} style={styles.cartRow}>
                <Text style={styles.cartItemName} numberOfLines={1}>{item.product_name}</Text>
                <View style={styles.qtyControls}>
                  <TouchableOpacity onPress={() => updateQuantity(item.product_id, -1)} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={16} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.product_id, 1)} style={styles.qtyBtn}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartSubtotal}>Rs.{item.subtotal}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total (Pay Later)</Text>
              <Text style={styles.totalValue}>Rs.{cartTotal}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        <TextInput
          style={styles.notesInput}
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          testID="order-notes"
        />

        {/* Place Order Button */}
        <TouchableOpacity
          style={[styles.placeOrderBtn, (!selectedCustomer || cart.length === 0) && styles.btnDisabled]}
          onPress={handlePlaceOrder}
          disabled={submitting || !selectedCustomer || cart.length === 0}
          testID="place-order-btn"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="receipt-outline" size={20} color="#fff" />
              <Text style={styles.placeOrderBtnText}>Place Order (Pay Later)</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              value={customerSearch}
              onChangeText={setCustomerSearch}
              autoFocus
            />
            <FlatList
              data={filteredCustomers}
              keyExtractor={c => c.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerRow}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setShowCustomerPicker(false);
                    setCustomerSearch('');
                    // Fetch pending balance for the selected customer
                    apiService.getCustomerBalance(item.id).then(b => setCustomerPendingBalance(b.pending_balance)).catch(() => setCustomerPendingBalance(null));
                  }}
                >
                  <Ionicons name="person-outline" size={18} color="#8B4513" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.customerName}>{item.business_name || item.username}</Text>
                    {item.business_name && <Text style={styles.customerUsername}>@{item.username}</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCustomerPicker(false);
                      openPaymentModal(item);
                    }}
                    style={styles.miniPayBtn}
                  >
                    <Ionicons name="card-outline" size={14} color="#8B4513" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {paymentCustomer && (
              <>
                <Text style={styles.paymentCustomerName}>
                  {paymentCustomer.business_name || paymentCustomer.username}
                </Text>
                {paymentLoading ? (
                  <ActivityIndicator color="#8B4513" style={{ marginVertical: 10 }} />
                ) : (
                  <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Pending Balance</Text>
                    <Text style={styles.balanceValue}>Rs.{pendingBalance}</Text>
                  </View>
                )}
                <TextInput
                  style={styles.paymentInput}
                  placeholder="Payment amount (Rs.)"
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  testID="payment-amount"
                />
                <TextInput
                  style={[styles.paymentInput, { height: 60 }]}
                  placeholder="Payment notes (optional)"
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  multiline
                  testID="payment-notes"
                />
                <TouchableOpacity
                  style={[styles.recordPaymentBtn, paymentLoading && styles.btnDisabled]}
                  onPress={handleRecordPayment}
                  disabled={paymentLoading}
                  testID="submit-payment-btn"
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.recordPaymentBtnText}>Record Payment</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f5f0' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderColor: '#e0d6cc' },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  content: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 8 },
  customerSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: '#ddd' },
  selectedCustomerRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  selectedCustomerText: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1 },
  placeholderText: { color: '#999', fontSize: 14 },
  paymentBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E7D32', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  paymentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pendingBadge: { backgroundColor: '#FFF3E0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E65100' },
  pendingBadgeText: { color: '#E65100', fontSize: 11, fontWeight: '700' },
  searchInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd', fontSize: 14, marginBottom: 10 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productCard: { width: '31%' as any, backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e0d6cc', minHeight: 70, justifyContent: 'space-between' },
  productCardActive: { borderColor: '#8B4513', borderWidth: 2, backgroundColor: '#faf5ef' },
  productName: { fontSize: 11, fontWeight: '600', color: '#333' },
  productPrice: { fontSize: 12, fontWeight: 'bold', color: '#8B4513', marginTop: 4 },
  qtyBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#8B4513', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  qtyBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  cartSection: { marginTop: 20, backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0d6cc' },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0ece6' },
  cartItemName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { backgroundColor: '#8B4513', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 15, fontWeight: 'bold', color: '#333', minWidth: 24, textAlign: 'center' },
  cartSubtotal: { fontSize: 13, fontWeight: 'bold', color: '#8B4513', minWidth: 60, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 2, borderColor: '#8B4513' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#8B4513' },
  notesInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd', fontSize: 14, marginTop: 14, minHeight: 50, textAlignVertical: 'top' },
  placeOrderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B4513', borderRadius: 10, padding: 16, marginTop: 16, gap: 8 },
  placeOrderBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '80%' as any },
  paymentModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  customerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#f0ece6' },
  customerName: { fontSize: 14, fontWeight: '600', color: '#333' },
  customerUsername: { fontSize: 11, color: '#999' },
  miniPayBtn: { padding: 8 },
  paymentCustomerName: { fontSize: 16, fontWeight: 'bold', color: '#8B4513', marginBottom: 10 },
  balanceCard: { backgroundColor: '#FFF3E0', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 14 },
  balanceLabel: { fontSize: 12, color: '#666' },
  balanceValue: { fontSize: 24, fontWeight: 'bold', color: '#E65100', marginTop: 4 },
  paymentInput: { backgroundColor: '#f8f5f0', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd', fontSize: 15, marginBottom: 10 },
  recordPaymentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2E7D32', borderRadius: 10, padding: 14, gap: 8 },
  recordPaymentBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  datePickerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 8, borderWidth: 1.5, borderColor: '#8B4513' },
  dateArrowBtn: { padding: 10, borderRadius: 8, backgroundColor: '#faf5ef' },
  dateDisplay: { flex: 1, alignItems: 'center' },
  dateDayName: { fontSize: 12, color: '#8B4513', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  dateText: { fontSize: 17, fontWeight: 'bold', color: '#333', marginTop: 2 },
});
