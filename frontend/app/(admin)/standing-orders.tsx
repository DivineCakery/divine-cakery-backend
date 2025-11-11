import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import apiService from '../../services/api';
import { showAlert } from '../../utils/alerts';
import { useAuthStore } from '../../store';

export default function StandingOrdersScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const [standingOrders, setStandingOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, cancelled

  // Create modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]); // [{product_id, product_name, quantity, price}]
  const [recurrenceType, setRecurrenceType] = useState('weekly_days'); // weekly_days or interval
  const [selectedDays, setSelectedDays] = useState([]); // [0,1,2,3,4,5,6] for Mon-Sun
  const [intervalDays, setIntervalDays] = useState('1');
  const [startDate, setStartDate] = useState(new Date()); // Start date for recurrence
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [durationType, setDurationType] = useState('indefinite'); // end_date or indefinite
  const [endDate, setEndDate] = useState(new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // View details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [generatedOrders, setGeneratedOrders] = useState([]);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const intervalOptions = [
    { label: 'Every Day', value: '1' },
    { label: 'Alternate Days', value: '2' },
    { label: 'Every 3 Days', value: '3' },
    { label: 'Every 4 Days', value: '4' },
    { label: 'Every 5 Days', value: '5' },
    { label: 'Weekly (Every 7 Days)', value: '7' },
  ];

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  // Debug logs for date picker state
  useEffect(() => {
    console.log('showStartDatePicker changed:', showStartDatePicker);
    console.log('Platform.OS:', Platform.OS);
    console.log('showCreateModal:', showCreateModal);
  }, [showStartDatePicker]);

  useEffect(() => {
    console.log('showEndDatePicker changed:', showEndDatePicker);
    console.log('Platform.OS:', Platform.OS);
    console.log('showCreateModal:', showCreateModal);
  }, [showEndDatePicker]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const [ordersData, customersData, productsData] = await Promise.all([
        apiService.getStandingOrders(status),
        apiService.getAllUsers(),
        apiService.getProducts(),
      ]);

      setStandingOrders(ordersData);
      setCustomers(customersData.filter((u: any) => u.role === 'customer'));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('Error', 'Failed to load standing orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        await logout();
        router.replace('/');
      }
    );
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  const addProduct = () => {
    if (selectedProducts.length < products.length) {
      setSelectedProducts([
        ...selectedProducts,
        { product_id: '', product_name: '', quantity: 1, price: 0 },
      ]);
    }
  };

  const removeProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const updated = [...selectedProducts];
    if (field === 'product') {
      const product = products.find((p: any) => p.id === value);
      updated[index] = {
        product_id: product.id,
        product_name: product.name,
        quantity: updated[index].quantity,
        price: product.price,
      };
    } else if (field === 'quantity') {
      updated[index].quantity = parseInt(value) || 1;
    }
    setSelectedProducts(updated);
  };

  const validateForm = () => {
    if (!selectedCustomer) {
      showAlert('Error', 'Please select a customer');
      return false;
    }
    if (selectedProducts.length === 0) {
      showAlert('Error', 'Please add at least one product');
      return false;
    }
    // Check if all added products have been selected
    const unselectedProducts = selectedProducts.filter((p) => !p.product_id);
    if (unselectedProducts.length > 0) {
      showAlert('Error', 'Please select a product for all added items');
      return false;
    }
    if (recurrenceType === 'weekly_days' && selectedDays.length === 0) {
      showAlert('Error', 'Please select at least one day of the week');
      return false;
    }
    if (recurrenceType === 'interval' && (!intervalDays || parseInt(intervalDays) < 1)) {
      showAlert('Error', 'Please select a valid interval');
      return false;
    }
    if (durationType === 'end_date' && endDate <= new Date()) {
      showAlert('Error', 'End date must be in the future');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setCreating(true);

      const recurrenceConfig =
        recurrenceType === 'weekly_days'
          ? { days: selectedDays }
          : { days: parseInt(intervalDays) };

      const standingOrderData = {
        customer_id: selectedCustomer,
        items: selectedProducts,
        recurrence_type: recurrenceType,
        recurrence_config: recurrenceConfig,
        duration_type: durationType,
        end_date: durationType === 'end_date' ? endDate.toISOString() : null,
        notes: notes.trim() || null,
      };

      await apiService.createStandingOrder(standingOrderData);
      showAlert('Success', 'Standing order created and next 10 days of orders generated!');
      resetForm();
      setShowCreateModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating standing order:', error);
      showAlert('Error', error.response?.data?.detail || 'Failed to create standing order');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedProducts([]);
    setRecurrenceType('weekly_days');
    setSelectedDays([]);
    setIntervalDays('1');
    setStartDate(new Date());
    setDurationType('indefinite');
    setEndDate(new Date());
    setNotes('');
  };

  const handleViewDetails = async (order: any) => {
    try {
      setSelectedOrder(order);
      setShowDetailsModal(true);
      const orders = await apiService.getGeneratedOrders(order.id);
      setGeneratedOrders(orders);
    } catch (error) {
      console.error('Error fetching generated orders:', error);
      showAlert('Error', 'Failed to load generated orders');
    }
  };

  const handleCancel = async (orderId: string) => {
    showAlert(
      'Cancel Standing Order',
      'Are you sure? This will delete all future auto-generated orders.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await apiService.updateStandingOrder(orderId, { status: 'cancelled' });
              // Immediately refresh the list
              await fetchData();
              setLoading(false);
              // Success feedback without blocking
              setTimeout(() => {
                showAlert('Success', 'Standing order cancelled successfully');
              }, 100);
            } catch (error: any) {
              setLoading(false);
              console.error('Error cancelling standing order:', error);
              showAlert('Error', error.response?.data?.detail || 'Failed to cancel standing order');
            }
          }
        }
      ]
    );
  };

  const handleDelete = async (orderId: string) => {
    showAlert(
      'Delete Standing Order',
      'Are you sure? This will permanently delete the standing order and all future orders.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting standing order:', orderId);
              setLoading(true);
              
              // Delete the order
              const response = await apiService.deleteStandingOrder(orderId);
              console.log('Delete response:', response);
              
              // Immediately update local state to remove the order
              setStandingOrders(prev => prev.filter(order => order.id !== orderId));
              
              // Also refresh from server to ensure sync
              await fetchData();
              
              setLoading(false);
              console.log('Standing order deleted successfully');
            } catch (error: any) {
              setLoading(false);
              console.error('Error deleting standing order:', error);
              console.error('Error details:', error.response?.data);
              showAlert('Error', error.response?.data?.detail || 'Failed to delete standing order');
            }
          }
        }
      ]
    );
  };

  const getRecurrenceText = (order: any) => {
    if (order.recurrence_type === 'weekly_days') {
      const days = order.recurrence_config.days.map((d: number) => dayNames[d]).join(', ');
      return `Weekly: ${days}`;
    } else {
      const interval = order.recurrence_config.days;
      if (interval === 1) return 'Every Day';
      if (interval === 2) return 'Alternate Days';
      if (interval === 7) return 'Weekly';
      return `Every ${interval} Days`;
    }
  };

  const getDurationText = (order: any) => {
    if (order.duration_type === 'indefinite') {
      return 'Indefinite';
    } else {
      const date = new Date(order.end_date);
      return `Until ${date.toLocaleDateString()}`;
    }
  };

  const renderStandingOrder = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <View
            style={[
              styles.statusBadge,
              item.status === 'active' ? styles.statusActive : styles.statusCancelled,
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleViewDetails(item)}>
          <Ionicons name="eye-outline" size={24} color="#8B4513" />
        </TouchableOpacity>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="repeat" size={16} color="#666" />
          <Text style={styles.detailText}>{getRecurrenceText(item)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.detailText}>{getDurationText(item)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cart" size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.items.length} product{item.items.length > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.detailText}>
            Created: {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.orderActions}>
        {item.status === 'active' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancel(item.id)}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {item.status === 'cancelled' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#8B4513" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Standing Orders</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#8B4513" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#8B4513" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Standing Orders</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterTabText, filterStatus === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'active' && styles.filterTabActive]}
          onPress={() => setFilterStatus('active')}
        >
          <Text
            style={[styles.filterTabText, filterStatus === 'active' && styles.filterTabTextActive]}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'cancelled' && styles.filterTabActive]}
          onPress={() => setFilterStatus('cancelled')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'cancelled' && styles.filterTabTextActive,
            ]}
          >
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Standing Orders List */}
      <FlatList
        data={standingOrders}
        renderItem={renderStandingOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="repeat" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No standing orders found</Text>
            <Text style={styles.emptySubtext}>Create one to get started</Text>
          </View>
        }
      />

      {/* Create Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Standing Order</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={28} color="#8B4513" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Customer Selection */}
            <Text style={styles.sectionLabel}>Customer *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedCustomer}
                onValueChange={(value) => setSelectedCustomer(value)}
                style={styles.picker}
              >
                <Picker.Item label="Select a customer..." value={null} />
                {customers
                  .sort((a: any, b: any) => {
                    const nameA = (a.name || a.username).toLowerCase();
                    const nameB = (b.name || b.username).toLowerCase();
                    return nameA.localeCompare(nameB);
                  })
                  .map((customer: any) => (
                    <Picker.Item
                      key={customer.id}
                      label={customer.name || customer.username}
                      value={customer.id}
                    />
                  ))}
              </Picker>
            </View>

            {/* Products */}
            <Text style={styles.sectionLabel}>Products *</Text>
            {selectedProducts.map((item, index) => (
              <View key={index} style={styles.productRow}>
                <View style={styles.productPickerWrapper}>
                  <Picker
                    selectedValue={item.product_id}
                    onValueChange={(value) => updateProduct(index, 'product', value)}
                    style={styles.productPicker}
                  >
                    <Picker.Item label="Select product..." value="" />
                    {products
                      .sort((a: any, b: any) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                      .map((product: any) => (
                        <Picker.Item
                          key={product.id}
                          label={product.name}
                          value={product.id}
                        />
                      ))}
                  </Picker>
                </View>
                <TextInput
                  style={styles.quantityInput}
                  value={item.quantity.toString()}
                  onChangeText={(text) => updateProduct(index, 'quantity', text)}
                  keyboardType="numeric"
                  placeholder="Qty"
                />
                <TouchableOpacity onPress={() => removeProduct(index)}>
                  <Ionicons name="trash-outline" size={24} color="#f44336" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addProductButton} onPress={addProduct}>
              <Ionicons name="add-circle" size={20} color="#8B4513" />
              <Text style={styles.addProductText}>Add Product</Text>
            </TouchableOpacity>

            {/* Recurrence Type */}
            <Text style={styles.sectionLabel}>Recurrence Pattern *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setRecurrenceType('weekly_days')}
              >
                <Ionicons
                  name={recurrenceType === 'weekly_days' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color="#8B4513"
                />
                <Text style={styles.radioText}>Days of Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setRecurrenceType('interval')}
              >
                <Ionicons
                  name={recurrenceType === 'interval' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color="#8B4513"
                />
                <Text style={styles.radioText}>Interval</Text>
              </TouchableOpacity>
            </View>

            {/* Weekly Days Selection */}
            {recurrenceType === 'weekly_days' && (
              <View style={styles.daysContainer}>
                {dayNames.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dayChip, selectedDays.includes(index) && styles.dayChipSelected]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDays.includes(index) && styles.dayChipTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Interval Selection */}
            {recurrenceType === 'interval' && (
              <View style={styles.intervalContainer}>
                {intervalOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.intervalChip,
                      intervalDays === option.value && styles.intervalChipSelected,
                    ]}
                    onPress={() => setIntervalDays(option.value)}
                  >
                    <Text
                      style={[
                        styles.intervalChipText,
                        intervalDays === option.value && styles.intervalChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Start Date */}
            <Text style={styles.sectionLabel}>Start From Date *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => {
                console.log('Start date button pressed!');
                setShowStartDatePicker(true);
                console.log('showStartDatePicker set to true');
              }}
            >
              <Ionicons name="calendar" size={20} color="#8B4513" />
              <Text style={styles.datePickerText}>{startDate.toDateString()}</Text>
            </TouchableOpacity>

            {/* Duration Type */}
            <Text style={styles.sectionLabel}>Duration *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setDurationType('indefinite')}
              >
                <Ionicons
                  name={durationType === 'indefinite' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color="#8B4513"
                />
                <Text style={styles.radioText}>Indefinite</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setDurationType('end_date')}
              >
                <Ionicons
                  name={durationType === 'end_date' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color="#8B4513"
                />
                <Text style={styles.radioText}>End Date</Text>
              </TouchableOpacity>
            </View>

            {/* End Date Picker */}
            {durationType === 'end_date' && (
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => {
                  console.log('End date button pressed!');
                  setShowEndDatePicker(true);
                  console.log('showEndDatePicker set to true');
                }}
              >
                <Ionicons name="calendar" size={20} color="#8B4513" />
                <Text style={styles.datePickerText}>{endDate.toDateString()}</Text>
              </TouchableOpacity>
            )}

            {/* Notes */}
            <Text style={styles.sectionLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any special instructions..."
              multiline
              numberOfLines={3}
            />

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, creating && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Create Standing Order</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker Modals - Outside create modal to avoid nesting issues */}
      
      {/* End Date Picker Modal for iOS */}
      {Platform.OS === 'ios' && showCreateModal && showEndDatePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select End Date</Text>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={endDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setEndDate(selectedDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* End Date Picker for Android */}
      {Platform.OS === 'android' && showCreateModal && showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}

      {/* End Date Picker for Web */}
      {Platform.OS === 'web' && showCreateModal && showEndDatePicker && (
        <Modal transparent animationType="fade">
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select End Date</Text>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.webDatePickerContent}>
                <input
                  type="date"
                  value={endDate.toISOString().split('T')[0]}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    if (!isNaN(selectedDate.getTime())) {
                      setEndDate(selectedDate);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '18px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Start Date Picker Modal for iOS */}
      {Platform.OS === 'ios' && showCreateModal && showStartDatePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setStartDate(selectedDate);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Start Date Picker for Android */}
      {Platform.OS === 'android' && showCreateModal && showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {/* Start Date Picker for Web */}
      {Platform.OS === 'web' && showCreateModal && showStartDatePicker && (
        <Modal transparent animationType="fade">
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.webDatePickerContent}>
                <input
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    if (!isNaN(selectedDate.getTime())) {
                      setStartDate(selectedDate);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '18px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Standing Order Details</Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Ionicons name="close" size={28} color="#8B4513" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Customer</Text>
                  <Text style={styles.detailsSectionText}>{selectedOrder.customer_name}</Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Products</Text>
                  {selectedOrder.items.map((item: any, index: number) => (
                    <Text key={index} style={styles.detailsSectionText}>
                      • {item.product_name} x {item.quantity}
                    </Text>
                  ))}
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Recurrence</Text>
                  <Text style={styles.detailsSectionText}>{getRecurrenceText(selectedOrder)}</Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Duration</Text>
                  <Text style={styles.detailsSectionText}>{getDurationText(selectedOrder)}</Text>
                </View>

                {selectedOrder.notes && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Notes</Text>
                    <Text style={styles.detailsSectionText}>{selectedOrder.notes}</Text>
                  </View>
                )}

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Generated Orders ({generatedOrders.length})</Text>
                  {generatedOrders.length === 0 ? (
                    <Text style={styles.detailsSectionText}>No orders generated yet</Text>
                  ) : (
                    generatedOrders.map((order: any, index: number) => (
                      <View key={order.id} style={styles.generatedOrderCard}>
                        <Text style={styles.generatedOrderDate}>
                          {new Date(order.delivery_date).toDateString()}
                        </Text>
                        <Text style={styles.generatedOrderStatus}>
                          Status: {order.order_status}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#8B4513',
  },
  filterTabText: {
    color: '#666',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 200,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusCancelled: {
    backgroundColor: '#f44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#ff9800',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  modalContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginTop: 16,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  picker: {
    height: 50,
    paddingTop: 8,
  },
  productPickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  productPicker: {
    height: 50,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  customerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  customerChipSelected: {
    backgroundColor: '#FFE4B5',
    borderColor: '#8B4513',
  },
  customerChipText: {
    color: '#666',
    fontWeight: '500',
  },
  customerChipTextSelected: {
    color: '#8B4513',
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  productSelect: {
    flex: 1,
  },
  productChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  productChipSelected: {
    backgroundColor: '#FFE4B5',
    borderColor: '#8B4513',
  },
  productChipText: {
    color: '#666',
    fontSize: 12,
  },
  productChipTextSelected: {
    color: '#8B4513',
    fontWeight: '600',
  },
  quantityInput: {
    width: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  addProductText: {
    color: '#8B4513',
    fontWeight: '600',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioText: {
    fontSize: 16,
    color: '#333',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayChipSelected: {
    backgroundColor: '#FFE4B5',
    borderColor: '#8B4513',
  },
  dayChipText: {
    color: '#666',
    fontWeight: '500',
  },
  dayChipTextSelected: {
    color: '#8B4513',
    fontWeight: '600',
  },
  intervalContainer: {
    gap: 8,
    marginBottom: 16,
  },
  intervalChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  intervalChipSelected: {
    backgroundColor: '#FFE4B5',
    borderColor: '#8B4513',
  },
  intervalChipText: {
    color: '#666',
    fontWeight: '500',
  },
  intervalChipTextSelected: {
    color: '#8B4513',
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingBottom: 20,
    maxWidth: 500,
    width: '90%',
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#666',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
  webDatePickerContent: {
    padding: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 80,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
  },
  detailsSectionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  generatedOrderCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
  },
  generatedOrderDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  generatedOrderStatus: {
    fontSize: 12,
    color: '#666',
  },
});
