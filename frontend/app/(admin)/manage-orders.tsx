import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  // Default to today's date for faster loading (instead of loading all 7 days)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingDeliveryDate, setEditingDeliveryDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomerEditModal, setShowCustomerEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editingCustomerName, setEditingCustomerName] = useState('');
  const [editingCustomerAddress, setEditingCustomerAddress] = useState('');
  
  // Order Edit Modal state
  const [showOrderEditModal, setShowOrderEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editingOrderItems, setEditingOrderItems] = useState<any[]>([]);
  const [editingOrderDate, setEditingOrderDate] = useState<Date>(new Date());
  const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
  
  // Add item to order state
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  
  // Expanded order state for compact view
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [selectedDate]);

  const fetchOrders = async () => {
    try {
      // Format date in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
      let dateStr: string | undefined;
      if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
      const data = await apiService.getOrders(dateStr);
      setOrders(data);
    } catch (error) {
      showAlert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sendWhatsAppMessage = async (order: any) => {
    try {
      // Format delivery date - use IST formatted date from backend if available
      const deliveryDateStr = order.delivery_date_formatted || order.delivery_date_ist || 
        (order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD');
      
      // Send confirmation message to CUSTOMER, not admin
      const message = `✅ Order Confirmed!\n\nYour order #${order.id.substring(0, 8)} has been confirmed by Divine Cakery.\n\nDelivery Date: ${deliveryDateStr}\n\nThank you for your order!\n- Divine Cakery`;
      
      // Get customer's phone number from order
      const customerPhone = order.user_phone || order.phone;
      
      if (!customerPhone) {
        showAlert('Info', 'Order confirmed, but customer phone number not available for WhatsApp notification');
        return;
      }
      
      // Remove any non-digit characters and ensure phone number format
      const phoneNumber = customerPhone.replace(/\D/g, '');
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp
        const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.log('WhatsApp notification error:', error);
      showAlert('Info', 'Order confirmed successfully, but could not open WhatsApp for customer notification');
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
      showAlert('Success', 'Order confirmed and marked as sale');
    } catch (error) {
      console.error('Error confirming order:', error);
      showAlert('Error', 'Failed to confirm order');
    }
  };

  const cancelOrder = async (orderId: string) => {
    console.log('Cancel Order clicked for:', orderId);
    showAlert(
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
              showAlert('Success', 'Order has been cancelled');
            } catch (error) {
              console.error('Error cancelling order:', error);
              showAlert('Error', 'Failed to cancel order');
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
      showAlert('Success', `Order status updated to ${newStatus}`);
    } catch (error) {
      showAlert('Error', 'Failed to update order');
    }
  };

  const handleDeleteStandingOrderOccurrence = async (order: any) => {
    if (!order.standing_order_id) return;
    
    showAlert(
      'Delete This Order',
      'This will delete only this single occurrence of the standing order. Other scheduled orders will not be affected. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteStandingOrderOccurrence(order.standing_order_id, order.id);
              await fetchOrders();
              showAlert('Success', 'Order occurrence deleted successfully');
            } catch (error: any) {
              console.error('Error deleting occurrence:', error);
              showAlert('Error', error.response?.data?.detail || 'Failed to delete order');
            }
          }
        }
      ]
    );
  };

  const openDeliveryDateEditor = (order: any) => {
    setEditingOrderId(order.id);
    // Use existing delivery_date or default to current date
    const currentDate = order.delivery_date ? new Date(order.delivery_date) : new Date();
    setEditingDeliveryDate(currentDate);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setEditingDeliveryDate(selectedDate);
    }
  };

  const confirmDateChange = async () => {
    if (!editingOrderId) return;
    
    try {
      setShowDatePicker(false);
      
      // Update the order with new delivery date
      await apiService.updateOrder(editingOrderId, { 
        delivery_date: editingDeliveryDate.toISOString() 
      });
      
      // Find the order to get customer details
      const order = orders.find((o: any) => o.id === editingOrderId);
      
      if (order && order.user_phone) {
        // Send WhatsApp notification to customer
        const formattedDate = editingDeliveryDate.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const message = `Hello! Your order #${order.id} delivery date has been updated to ${formattedDate}. Thank you for your patience! - Divine Cakery`;
        
        // Remove any non-digit characters and ensure phone number format
        const phoneNumber = order.user_phone.replace(/\D/g, '');
        const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
        
        try {
          const canOpen = await Linking.canOpenURL(whatsappUrl);
          if (canOpen) {
            await Linking.openURL(whatsappUrl);
          } else {
            // Fallback to web WhatsApp
            const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            await Linking.openURL(webUrl);
          }
        } catch (error) {
          console.log('WhatsApp notification error:', error);
          // Don't fail the whole operation if WhatsApp fails
        }
      } else {
        console.log('No phone number available for customer notification');
      }
      
      await fetchOrders();
      showAlert('Success', 'Delivery date updated successfully');
      setEditingOrderId(null);
    } catch (error) {
      console.error('Error updating delivery date:', error);
      showAlert('Error', 'Failed to update delivery date');
    }
  };

  const cancelDateChange = () => {
    setShowDatePicker(false);
    setEditingOrderId(null);
  };

  const openCustomerEditor = (order: any) => {
    setEditingCustomer({
      user_id: order.user_id,
      user_name: order.user_name,
      address: order.delivery_address,
    });
    setEditingCustomerName(order.user_name || '');
    setEditingCustomerAddress(order.delivery_address || '');
    setShowCustomerEditModal(true);
  };

  const saveCustomerDetails = async () => {
    if (!editingCustomer) return;
    
    try {
      // Update the user profile with new username and address
      await apiService.updateUserByAdmin(editingCustomer.user_id, {
        username: editingCustomerName,
        address: editingCustomerAddress,
      });
      
      setShowCustomerEditModal(false);
      await fetchOrders();
      showAlert('Success', 'Customer details updated successfully. These changes will reflect in the customer profile.');
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error updating customer details:', error);
      showAlert('Error', 'Failed to update customer details');
    }
  };

  const cancelCustomerEdit = () => {
    setShowCustomerEditModal(false);
    setEditingCustomer(null);
  };

  const openOrderEditor = async (order: any) => {
    setEditingOrder(order);
    setEditingOrderItems(JSON.parse(JSON.stringify(order.items))); // Deep copy
    setEditingOrderDate(order.delivery_date ? new Date(order.delivery_date) : new Date());
    setShowOrderEditModal(true);
    
    // Fetch all products for adding items (only fetch once)
    if (allProducts.length === 0) {
      try {
        const products = await apiService.getProducts(undefined, undefined, true);
        setAllProducts(products);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    }
  };

  const openProductPicker = () => {
    setProductSearchQuery('');
    setShowProductPicker(true);
  };

  const addProductToOrder = (product: any) => {
    // Check if product already exists in order
    const existingIndex = editingOrderItems.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      // Increment quantity if already exists
      const updatedItems = [...editingOrderItems];
      updatedItems[existingIndex].quantity += 1;
      updatedItems[existingIndex].subtotal = updatedItems[existingIndex].price * updatedItems[existingIndex].quantity;
      setEditingOrderItems(updatedItems);
    } else {
      // Add new item
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price,
        unit: product.unit || 'piece',
        subtotal: product.price,
      };
      setEditingOrderItems([...editingOrderItems, newItem]);
    }
    
    setShowProductPicker(false);
    setProductSearchQuery('');
  };

  const getFilteredProducts = () => {
    if (!productSearchQuery.trim()) {
      return allProducts.slice(0, 20); // Show first 20 products when no search
    }
    return allProducts.filter(product => 
      product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
    ).slice(0, 20);
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    const updatedItems = [...editingOrderItems];
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      updatedItems.splice(index, 1);
    } else {
      updatedItems[index].quantity = newQuantity;
      updatedItems[index].subtotal = updatedItems[index].price * newQuantity;
    }
    setEditingOrderItems(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = editingOrderItems.filter((_, i) => i !== index);
    setEditingOrderItems(updatedItems);
  };

  const calculateNewTotal = () => {
    const itemsTotal = editingOrderItems.reduce((sum, item) => sum + (item.subtotal || item.price * item.quantity), 0);
    return itemsTotal;
  };

  const saveOrderChanges = async () => {
    if (!editingOrder || editingOrderItems.length === 0) {
      showAlert('Error', 'Order must have at least one item');
      return;
    }

    try {
      const newTotal = calculateNewTotal();
      
      await apiService.updateOrder(editingOrder.id, {
        items: editingOrderItems,
        total_amount: newTotal,
        delivery_date: editingOrderDate.toISOString(),
      });

      setShowOrderEditModal(false);
      await fetchOrders();
      showAlert('Success', 'Order updated successfully');
      setEditingOrder(null);
      setEditingOrderItems([]);
    } catch (error) {
      console.error('Error updating order:', error);
      showAlert('Error', 'Failed to update order');
    }
  };

  const cancelOrderEdit = () => {
    setShowOrderEditModal(false);
    setEditingOrder(null);
    setEditingOrderItems([]);
  };

  const changeDate = (days: number) => {
    const newDate = selectedDate ? new Date(selectedDate) : new Date();
    newDate.setDate(newDate.getDate() + days);
    
    // Set date range: 7 days past to 30 days future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const thirtyDaysAhead = new Date(today);
    thirtyDaysAhead.setDate(today.getDate() + 30);
    
    // Don't allow dates beyond 30 days in the future
    if (newDate > thirtyDaysAhead) {
      showAlert('Info', 'Cannot view orders beyond 30 days in the future');
      return;
    }
    
    // Don't allow dates older than 7 days
    if (newDate < sevenDaysAgo) {
      showAlert('Info', 'Cannot view orders older than 7 days');
      return;
    }
    
    setSelectedDate(newDate);
    setLoading(true);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setLoading(true);
  };

  const formatDisplayDate = () => {
    if (!selectedDate) return 'All Orders';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    let prefix = '';
    if (selected < today) {
      prefix = 'Past: ';
    } else if (selected.getTime() === today.getTime()) {
      prefix = 'Today: ';
    } else {
      prefix = 'Future: ';
    }
    
    return prefix + selectedDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderOrder = ({ item, index }: any) => {
    const isExpanded = expandedOrderId === item.id;
    const statusColor = STATUS_COLORS[item.order_status || item.status || 'pending'] || '#999';
    
    return (
      <TouchableOpacity 
        style={[
          styles.orderCard,
          styles.compactOrderCard,
          index % 2 === 0 ? styles.orderCardEven : styles.orderCardOdd,
          item.is_pay_later && styles.orderCardPayLater
        ]}
        onPress={() => setExpandedOrderId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        {/* Compact Header - Always Visible */}
        <View style={styles.compactHeader}>
          <View style={styles.compactHeaderLeft}>
            <Text style={styles.compactOrderNumber}>#{item.order_number || item.id?.slice(-4)}</Text>
            <Text style={styles.compactCustomerName}>{item.user_name || 'N/A'}</Text>
            {item.is_pay_later && (
              <View style={styles.compactPayLaterBadge}>
                <Text style={styles.compactPayLaterText}>Pay Later</Text>
              </View>
            )}
          </View>
          <View style={styles.compactHeaderRight}>
            <View style={[styles.compactStatusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.compactStatusText}>
                {(item.order_status || item.status || 'pending').toUpperCase()}
              </Text>
            </View>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#8B4513" 
            />
          </View>
        </View>

        {/* Expanded Details - Only visible when expanded */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Order Amount & Type */}
            <View style={styles.expandedRow}>
              <Text style={styles.orderAmount}>₹{(item.total_amount || 0).toFixed(2)}</Text>
              <View style={[
                styles.orderTypeDisplay, 
                item.order_type === 'delivery' ? styles.orderTypeDelivery : styles.orderTypePickup
              ]}>
                <Ionicons 
                  name={item.order_type === 'delivery' ? 'bicycle' : 'basket'} 
                  size={14} 
                  color="#fff" 
                />
                <Text style={styles.orderTypeDisplayText}>
                  {item.order_type === 'delivery' ? 'DELIVERY' : 'PICKUP'}
                </Text>
              </View>
            </View>

            {/* Customer Information */}
            <View style={styles.customerSection}>
              <View style={styles.customerHeader}>
                <View style={styles.customerTitleContainer}>
                  <Ionicons name="person-circle" size={20} color="#8B4513" />
                  <Text style={styles.customerTitle}>Customer</Text>
                </View>
                <TouchableOpacity 
                  style={styles.editCustomerButton}
                  onPress={() => {
                    console.log('Edit button pressed for order:', item.id);
                    openCustomerEditor(item);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={14} color="#8B4513" />
                  <Text style={styles.editCustomerText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.customerName}>{item.user_name || 'N/A'}</Text>
              {item.delivery_address && (
                <Text style={styles.customerAddress}>{item.delivery_address}</Text>
              )}
            </View>

            {/* Items List */}
            <View style={styles.itemsSection}>
              <View style={styles.itemsHeader}>
                <View style={styles.itemsTitleContainer}>
                  <Ionicons name="cart" size={18} color="#8B4513" />
                  <Text style={styles.itemsTitle}>Items Ordered</Text>
                </View>
                <TouchableOpacity 
                  style={styles.editOrderButton}
                  onPress={() => openOrderEditor(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={16} color="#8B4513" />
                  <Text style={styles.editOrderText}>Edit Order</Text>
                </TouchableOpacity>
              </View>
              {item.items && item.items.map((orderItem: any, idx: number) => (
                <View key={`${item.id}-item-${idx}`} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{orderItem.product_name}</Text>
                    <Text style={styles.itemQuantity}>Qty: {orderItem.quantity} × ₹{orderItem.price.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.itemTotal}>₹{(orderItem.subtotal || orderItem.quantity * orderItem.price).toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.orderDetails}>
              <Text style={styles.detailText}>Payment: {item.payment_method}</Text>
              <Text style={styles.detailText}>Order Date: {new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
              <View style={styles.deliveryDateContainer}>
                <Text style={styles.detailText}>
                  Delivery: {item.delivery_date_formatted || item.delivery_date_ist || (item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('en-IN') : 'Not set')}
                </Text>
                <TouchableOpacity 
                  style={styles.editDateButton}
                  onPress={() => openDeliveryDateEditor(item)}
                >
                  <Ionicons name="calendar" size={16} color="#8B4513" />
                  <Text style={styles.editDateText}>Edit</Text>
                </TouchableOpacity>
              </View>
              {item.notes && typeof item.notes === 'string' && item.notes.trim() !== '' && (
                <View style={styles.notesContainer}>
                  <Ionicons name="document-text" size={16} color="#666" />
                  <Text style={styles.notesText}>Note: {item.notes}</Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtons}>
              {(item.order_status || item.status) === 'pending' && (
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
              {(item.order_status || item.status) === 'confirmed' && (
                <View style={[styles.actionButton, styles.statusButton, styles.confirmedButton]}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Confirmed</Text>
                </View>
              )}
              {(item.order_status || item.status) === 'processing' && (
                <View style={[styles.actionButton, styles.statusButton, styles.processingButton]}>
                  <Ionicons name="sync" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Processing</Text>
                </View>
              )}
              {(item.order_status || item.status) === 'delivered' && (
                <View style={[styles.actionButton, styles.statusButton, styles.deliveredButton]}>
                  <Ionicons name="checkmark-done" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Delivered</Text>
                </View>
              )}
              {(item.order_status || item.status) === 'cancelled' && (
                <View style={[styles.actionButton, styles.statusButton, styles.cancelledButton]}>
                  <Ionicons name="ban" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancelled</Text>
                </View>
              )}
              {item.standing_order_id && (
                <TouchableOpacity
                  style={styles.deleteOccurrenceBtn}
                  onPress={() => handleDeleteStandingOrderOccurrence(item)}
                >
                  <Ionicons name="trash-outline" size={18} color="#f44336" />
                  <Text style={styles.deleteOccurrenceText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
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

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color="#666" />
        <Text style={styles.infoText}>
          View orders: 7 days past • Today • 30 days future
        </Text>
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

      {/* Date Picker Modal */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelDateChange}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Delivery Date</Text>
              <DateTimePicker
                value={editingDeliveryDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.datePicker}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={cancelDateChange}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmModalButton]}
                  onPress={confirmDateChange}
                >
                  <Text style={styles.modalButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={editingDeliveryDate}
            mode="date"
            display="default"
            onChange={async (event, date) => {
              if (event.type === 'set' && date) {
                setEditingDeliveryDate(date);
                setShowDatePicker(false);
                
                // Directly use the date parameter instead of waiting for state update
                if (!editingOrderId) return;
                
                try {
                  // Update the order with new delivery date
                  await apiService.updateOrder(editingOrderId, { 
                    delivery_date: date.toISOString() 
                  });
                  
                  // Find the order to get customer details
                  const order = orders.find((o: any) => o.id === editingOrderId);
                  
                  if (order && order.user_phone) {
                    // Send WhatsApp notification to customer
                    const formattedDate = date.toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    });
                    const message = `Hello! Your order #${order.id} delivery date has been updated to ${formattedDate}. Thank you for your patience! - Divine Cakery`;
                    
                    // Remove any non-digit characters and ensure phone number format
                    const phoneNumber = order.user_phone.replace(/\D/g, '');
                    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
                    
                    try {
                      const canOpen = await Linking.canOpenURL(whatsappUrl);
                      if (canOpen) {
                        await Linking.openURL(whatsappUrl);
                      } else {
                        // Fallback to web WhatsApp
                        const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                        await Linking.openURL(webUrl);
                      }
                    } catch (error) {
                      console.log('WhatsApp notification error:', error);
                      // Don't fail the whole operation if WhatsApp fails
                    }
                  } else {
                    console.log('No phone number available for customer notification');
                  }
                  
                  await fetchOrders();
                  showAlert('Success', 'Delivery date updated successfully');
                  setEditingOrderId(null);
                } catch (error) {
                  console.error('Error updating delivery date:', error);
                  showAlert('Error', 'Failed to update delivery date');
                }
              } else {
                cancelDateChange();
              }
            }}
          />
        )
      )}

      {/* Customer Edit Modal */}
      <Modal
        visible={showCustomerEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelCustomerEdit}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.customerModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Customer Details</Text>
              <Text style={styles.modalSubtitle}>Changes will update customer's profile permanently</Text>

              <Text style={styles.inputLabel}>Customer Name</Text>
              <TextInput
                style={styles.input}
                value={editingCustomerName}
                onChangeText={setEditingCustomerName}
                placeholder="Enter customer name"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingCustomerAddress}
                onChangeText={setEditingCustomerAddress}
                placeholder="Enter delivery address"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={cancelCustomerEdit}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmModalButton]}
                  onPress={saveCustomerDetails}
                >
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Order Edit Modal */}
      <Modal
        visible={showOrderEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelOrderEdit}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.orderEditModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Order #{editingOrder?.order_number || editingOrder?.id}</Text>
              <Text style={styles.modalSubtitle}>Modify items, quantities, or delivery date</Text>

              {/* Delivery Date */}
              <Text style={styles.inputLabel}>Delivery Date</Text>
              <View style={styles.dateControlContainer}>
                <TouchableOpacity
                  style={styles.dateChangeButton}
                  onPress={() => {
                    const newDate = new Date(editingOrderDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setEditingOrderDate(newDate);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={24} color="#8B4513" />
                </TouchableOpacity>

                <View style={styles.dateCenterDisplay}>
                  <Ionicons name="calendar" size={20} color="#8B4513" />
                  <Text style={styles.dateDisplayText}>
                    {editingOrderDate.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.dateChangeButton}
                  onPress={() => {
                    const newDate = new Date(editingOrderDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setEditingOrderDate(newDate);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={24} color="#8B4513" />
                </TouchableOpacity>
              </View>
              <Text style={styles.dateHint}>Use arrows to change delivery date</Text>

              {/* Order Items */}
              <View style={styles.orderItemsHeader}>
                <Text style={[styles.inputLabel, {marginTop: 15, marginBottom: 0}]}>Order Items</Text>
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={openProductPicker}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addItemButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>
              
              {editingOrderItems.map((item, index) => (
                <View key={index} style={styles.editItemCard}>
                  <View style={styles.editItemHeader}>
                    <Text style={styles.editItemName}>{item.product_name}</Text>
                    <TouchableOpacity
                      style={styles.removeItemButton}
                      onPress={() => removeItem(index)}
                    >
                      <Ionicons name="trash" size={18} color="#f44336" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.editItemControls}>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateItemQuantity(index, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={20} color="#8B4513" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.quantityInput}
                        value={String(item.quantity)}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 0;
                          updateItemQuantity(index, num);
                        }}
                        keyboardType="number-pad"
                        selectTextOnFocus={true}
                        maxLength={4}
                      />
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateItemQuantity(index, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={20} color="#8B4513" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.editItemPrice}>
                      ₹{item.price.toFixed(2)} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Total */}
              <View style={styles.orderEditTotal}>
                <Text style={styles.orderEditTotalLabel}>New Total:</Text>
                <Text style={styles.orderEditTotalValue}>₹{calculateNewTotal().toFixed(2)}</Text>
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={cancelOrderEdit}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmModalButton]}
                  onPress={saveOrderChanges}
                >
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Product Picker Modal */}
      <Modal
        visible={showProductPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProductPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.productPickerHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.productSearchInput}
              placeholder="Search products..."
              value={productSearchQuery}
              onChangeText={setProductSearchQuery}
              autoFocus={true}
            />
            
            <ScrollView style={styles.productList}>
              {getFilteredProducts().map((product) => {
                const isInOrder = editingOrderItems.some(item => item.product_id === product.id);
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productPickerItem, isInOrder && styles.productPickerItemInOrder]}
                    onPress={() => addProductToOrder(product)}
                  >
                    <View style={styles.productPickerInfo}>
                      <Text style={styles.productPickerName}>{product.name}</Text>
                      <Text style={styles.productPickerPrice}>₹{product.price.toFixed(2)} / {product.unit || 'piece'}</Text>
                    </View>
                    <View style={styles.productPickerAction}>
                      {isInOrder ? (
                        <View style={styles.inOrderBadge}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.inOrderText}>In Order</Text>
                        </View>
                      ) : (
                        <Ionicons name="add-circle" size={28} color="#8B4513" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {getFilteredProducts().length === 0 && (
                <View style={styles.noProductsFound}>
                  <Ionicons name="search" size={48} color="#ccc" />
                  <Text style={styles.noProductsText}>No products found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  compactOrderCard: { padding: 12, marginBottom: 8 },
  orderCardEven: { backgroundColor: '#fff' },
  orderCardOdd: { backgroundColor: '#FFFACD' },
  orderCardPayLater: { 
    backgroundColor: '#FFEBEE', 
    borderWidth: 2, 
    borderColor: '#EF5350',
  },
  // Compact header styles
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  compactHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactOrderNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  compactCustomerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  compactPayLaterBadge: {
    backgroundColor: '#E65100',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  compactPayLaterText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  compactStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  expandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderHeaderLeft: { flex: 1 },
  payLaterBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E65100', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 12, 
    marginTop: 5,
    alignSelf: 'flex-start',
    gap: 4,
  },
  payLaterBadgeText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  orderNumber: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  orderAmount: { fontSize: 20, fontWeight: 'bold', color: '#8B4513' },
  orderTypeDisplayContainer: { marginBottom: 12, alignItems: 'flex-start' },
  orderTypeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  orderTypeDelivery: {
    backgroundColor: '#2196F3',
  },
  orderTypePickup: {
    backgroundColor: '#4CAF50',
  },
  orderTypeDisplayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  orderDetails: { marginBottom: 10 },
  detailText: { fontSize: 14, color: '#666', marginBottom: 3 },
  notesContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF8DC',
    borderRadius: 6,
  },
  notesText: { 
    fontSize: 13, 
    color: '#666', 
    fontStyle: 'italic',
    flex: 1,
    marginLeft: 6,
  },
  customerSection: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  customerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  editOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 5,
  },
  editOrderText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
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
  statusContainer: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  deleteOccurrenceBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 },
  deleteOccurrenceText: { color: '#f44336', fontSize: 12, fontWeight: '600' },
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
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dateButton: {
    padding: 10,
  },
  dateDisplay: {
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  dateDay: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8DC',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  clearFilterText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B0D4F1',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  deliveryDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  editDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B4513',
    gap: 4,
  },
  editDateText: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 20,
  },
  datePicker: {
    width: '100%',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#9E9E9E',
  },
  confirmModalButton: {
    backgroundColor: '#8B4513',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8B4513',
    gap: 4,
  },
  editCustomerText: {
    fontSize: 11,
    color: '#8B4513',
    fontWeight: 'bold',
  },
  customerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  orderEditModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 20,
    padding: 20,
    maxHeight: '90%',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    gap: 10,
  },
  datePickerText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  dateControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8DC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 5,
  },
  dateChangeButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  dateCenterDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dateHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  editItemCard: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  editItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  removeItemButton: {
    padding: 5,
  },
  editItemControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  quantityButton: {
    padding: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 15,
    minWidth: 40,
    textAlign: 'center',
  },
  quantityInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 50,
    textAlign: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#8B4513',
    borderRadius: 4,
  },
  editItemPrice: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  orderEditTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  orderEditTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  orderEditTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  // Add Item styles
  orderItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  productSearchInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
    marginBottom: 15,
  },
  productList: {
    maxHeight: 400,
  },
  productPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#fff',
  },
  productPickerItemInOrder: {
    backgroundColor: '#E8F5E9',
  },
  productPickerInfo: {
    flex: 1,
  },
  productPickerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPickerPrice: {
    fontSize: 13,
    color: '#666',
  },
  productPickerAction: {
    marginLeft: 10,
  },
  inOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inOrderText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  noProductsFound: {
    alignItems: 'center',
    padding: 40,
  },
  noProductsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});
