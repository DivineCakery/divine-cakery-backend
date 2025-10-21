import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { DIVINE_WHATSAPP_NUMBER, getAdminOrderNotification } from '../../constants/whatsapp';

const STATUS_COLORS: any = {
  pending: '#FFA500',
  confirmed: '#4CAF50',
  processing: '#2196F3',
  delivered: '#4CAF50',
  cancelled: '#f44336',
};

export default function ManageOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [selectedDate]);

  const fetchOrders = async () => {
    try {
      const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined;
      const data = await apiService.getOrders(dateStr);
      setOrders(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sendWhatsAppMessage = async (order: any) => {
    try {
      const message = getAdminOrderNotification(order.id.slice(0, 8));
      
      // Use business WhatsApp number instead of customer's
      const whatsappUrl = `whatsapp://send?phone=${DIVINE_WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp
        const webUrl = `https://wa.me/${DIVINE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open WhatsApp');
    }
  };

  const confirmOrder = async (orderId: string, order: any) => {
    console.log('Confirm Order clicked for:', orderId);
    try {
      // Update both order status and payment status to mark as sale
      await apiService.updateOrder(orderId, { 
        order_status: 'confirmed',
        payment_status: 'completed'  // Mark as completed sale
      });
      
      console.log('Order updated successfully');
      
      // Automatically send WhatsApp notification
      await sendWhatsAppMessage(order);
      
      await fetchOrders();
      Alert.alert('Success', 'Order confirmed and marked as sale');
    } catch (error) {
      console.error('Error confirming order:', error);
      Alert.alert('Error', 'Failed to confirm order');
    }
  };

  const cancelOrder = async (orderId: string) => {
    console.log('Cancel Order clicked for:', orderId);
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed cancellation');
            try {
              await apiService.updateOrder(orderId, { 
                order_status: 'cancelled',
                payment_status: 'cancelled'
              });
              console.log('Order cancelled successfully');
              await fetchOrders();
              Alert.alert('Success', 'Order has been cancelled');
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, order: any) => {
    try {
      await apiService.updateOrder(orderId, { order_status: newStatus });
      await fetchOrders();
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update order');
    }
  };

  const changeDate = (days: number) => {
    const newDate = selectedDate ? new Date(selectedDate) : new Date();
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setLoading(true);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setLoading(true);
  };

  const formatDisplayDate = () => {
    if (!selectedDate) return 'All Orders';
    return selectedDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderOrder = ({ item }: any) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Order #{item.id.slice(0, 8)}</Text>
        <Text style={styles.orderAmount}>₹{item.total_amount.toFixed(2)}</Text>
      </View>

      {/* Customer Information */}
      <View style={styles.customerSection}>
        <View style={styles.customerHeader}>
          <Ionicons name="person-circle" size={20} color="#8B4513" />
          <Text style={styles.customerTitle}>Customer</Text>
        </View>
        <Text style={styles.customerName}>{item.user_name || 'N/A'}</Text>
        {item.delivery_address && (
          <Text style={styles.customerAddress}>{item.delivery_address}</Text>
        )}
      </View>

      {/* Items List */}
      <View style={styles.itemsSection}>
        <View style={styles.itemsHeader}>
          <Ionicons name="cart" size={18} color="#8B4513" />
          <Text style={styles.itemsTitle}>Items Ordered</Text>
        </View>
        {item.items && item.items.map((orderItem: any, index: number) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{orderItem.product_name}</Text>
              <Text style={styles.itemQuantity}>Qty: {orderItem.quantity} × ₹{orderItem.price.toFixed(2)}</Text>
            </View>
            <Text style={styles.itemTotal}>₹{orderItem.subtotal.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.detailText}>Payment: {item.payment_method}</Text>
        <Text style={styles.detailText}>Date: {new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.order_status] }]}>
          <Text style={styles.statusText}>{item.order_status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        {item.order_status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.statusButton, styles.pendingButton]}
              onPress={() => confirmOrder(item.id, item)}
            >
              <Ionicons name="time-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Tap to Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.statusButton, styles.cancelButton]}
              onPress={() => cancelOrder(item.id)}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
        {item.order_status === 'confirmed' && (
          <View style={[styles.actionButton, styles.statusButton, styles.confirmedButton]}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Confirmed</Text>
          </View>
        )}
        {item.order_status === 'processing' && (
          <View style={[styles.actionButton, styles.statusButton, styles.processingButton]}>
            <Ionicons name="sync" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Processing</Text>
          </View>
        )}
        {item.order_status === 'delivered' && (
          <View style={[styles.actionButton, styles.statusButton, styles.deliveredButton]}>
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delivered</Text>
          </View>
        )}
        {item.order_status === 'cancelled' && (
          <View style={[styles.actionButton, styles.statusButton, styles.cancelledButton]}>
            <Ionicons name="ban" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Cancelled</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Orders</Text>
      </View>

      {/* Date Filter Selector */}
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => changeDate(-1)}
        >
          <Ionicons name="chevron-back" size={24} color="#8B4513" />
        </TouchableOpacity>
        
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDisplayDate()}</Text>
          {selectedDate && (
            <Text style={styles.dateDay}>
              {selectedDate.toLocaleDateString('en-IN', { weekday: 'long' })}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => changeDate(1)}
        >
          <Ionicons name="chevron-forward" size={24} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {selectedDate && (
        <TouchableOpacity style={styles.clearFilterButton} onPress={clearDateFilter}>
          <Ionicons name="close-circle" size={16} color="#8B4513" />
          <Text style={styles.clearFilterText}>Show All Orders</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        }
      />
    </View>
  );

  function onRefresh() {
    setRefreshing(true);
    fetchOrders();
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8DC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8DC' },
  header: { backgroundColor: '#8B4513', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  listContainer: { padding: 15, paddingBottom: 100 },
  orderCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  orderNumber: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  orderAmount: { fontSize: 20, fontWeight: 'bold', color: '#8B4513' },
  orderDetails: { marginBottom: 10 },
  detailText: { fontSize: 14, color: '#666', marginBottom: 3 },
  customerSection: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  customerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  customerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  itemsSection: {
    backgroundColor: '#FFF8DC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  statusContainer: { marginBottom: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  statusButton: {
    flex: 1,
    minHeight: 48,
  },
  pendingButton: {
    backgroundColor: '#FF9800',
  },
  confirmedButton: {
    backgroundColor: '#4CAF50',
  },
  processingButton: {
    backgroundColor: '#2196F3',
  },
  deliveredButton: {
    backgroundColor: '#4CAF50',
  },
  cancelledButton: {
    backgroundColor: '#9E9E9E',
    opacity: 0.8,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 10 },
});
