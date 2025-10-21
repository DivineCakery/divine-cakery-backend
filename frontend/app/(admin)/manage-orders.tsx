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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await apiService.getOrders();
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
    try {
      // Update both order status and payment status to mark as sale
      await apiService.updateOrder(orderId, { 
        order_status: 'confirmed',
        payment_status: 'completed'  // Mark as completed sale
      });
      
      // Automatically send WhatsApp notification
      await sendWhatsAppMessage(order);
      
      await fetchOrders();
      Alert.alert('Success', 'Order confirmed and marked as sale');
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm order');
    }
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

  const renderOrder = ({ item }: any) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Order #{item.id.slice(0, 8)}</Text>
        <Text style={styles.orderAmount}>₹{item.total_amount.toFixed(2)}</Text>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.detailText}>Items: {item.items.length}</Text>
        <Text style={styles.detailText}>Payment: {item.payment_method}</Text>
        <Text style={styles.detailText}>Date: {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.order_status] }]}>
          <Text style={styles.statusText}>{item.order_status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        {item.order_status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.pendingButton]}
            onPress={() => confirmOrder(item.id, item)}
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Pending - Tap to Confirm</Text>
          </TouchableOpacity>
        )}
        {item.order_status === 'confirmed' && (
          <>
            <View style={[styles.actionButton, styles.confirmedButton]}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Confirmed ✓</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3', marginTop: 8 }]}
              onPress={() => updateOrderStatus(item.id, 'processing', item)}
            >
              <Text style={styles.actionButtonText}>Mark as Processing</Text>
            </TouchableOpacity>
          </>
        )}
        {item.order_status === 'processing' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => updateOrderStatus(item.id, 'delivered', item)}
          >
            <Text style={styles.actionButtonText}>Mark Delivered</Text>
          </TouchableOpacity>
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
  statusContainer: { marginBottom: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    gap: 8,
  },
  pendingButton: {
    backgroundColor: '#FF9800',
    marginRight: 0,
    flex: 1,
  },
  confirmedButton: {
    backgroundColor: '#4CAF50',
    marginRight: 0,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 10 },
});
