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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { DIVINE_WHATSAPP_CUSTOMER_SUPPORT } from '../../constants/whatsapp';

const STATUS_COLORS: any = {
  pending: '#FFA500',
  confirmed: '#4CAF50',
  processing: '#2196F3',
  delivered: '#4CAF50',
  cancelled: '#f44336',
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await apiService.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
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

  const renderOrderItem = ({ item }: any) => {
    const isExpanded = expandedOrderId === item.id;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => toggleOrderExpansion(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <MaterialCommunityIcons name="clipboard-text" size={24} color="#8B4513" />
            <View style={styles.orderHeaderText}>
              <Text style={styles.orderNumber}>Order #{item.id}</Text>
              <Text style={styles.orderDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#666"
          />
        </View>

        <View style={styles.orderStatus}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[item.order_status] },
            ]}
          >
            <Text style={styles.statusText}>{item.order_status.toUpperCase()}</Text>
          </View>
          <Text style={styles.orderAmount}>₹{item.total_amount.toFixed(2)}</Text>
        </View>

        {isExpanded && (
          <View style={styles.orderDetails}>
            <View style={styles.divider} />
            
            <Text style={styles.detailsTitle}>Items:</Text>
            {item.items.map((orderItem: any, index: number) => (
              <View key={index} style={styles.orderItem}>
                <Text style={styles.itemName}>• {orderItem.product_name}</Text>
                <Text style={styles.itemDetails}>
                  {orderItem.quantity} x ₹{orderItem.price.toFixed(2)} = ₹{orderItem.subtotal.toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Method:</Text>
              <Text style={styles.infoValue}>{item.payment_method.toUpperCase()}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Status:</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: item.payment_status === 'completed' ? '#4CAF50' : '#FFA500' },
                ]}
              >
                {item.payment_status.toUpperCase()}
              </Text>
            </View>

            {item.delivery_address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Delivery Address:</Text>
                <Text style={[styles.infoValue, styles.addressText]}>
                  {item.delivery_address}
                </Text>
              </View>
            )}

            {item.notes && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Notes:</Text>
                <Text style={[styles.infoValue, styles.notesText]}>{item.notes}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity onPress={handleContactUs} style={styles.contactButton}>
          <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
          <Text style={styles.contactButtonText}>Contact Us</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>Your orders will appear here</Text>
          </View>
        }
      />
    </View>
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
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderHeaderText: {
    marginLeft: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  orderStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  orderDetails: {
    marginTop: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  orderItem: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
    marginLeft: 12,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  addressText: {
    fontWeight: 'normal',
  },
  notesText: {
    fontWeight: 'normal',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
});
