import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useAuthStore } from '../../store';

export default function ManageDiscountsScreen() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    discount_type: 'percentage',
    discount_value: '',
    start_date: '',
    end_date: '',
  });
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDiscounts();
    fetchUsers();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const data = await apiService.getAllDiscounts();
      setDiscounts(data);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      Alert.alert('Error', 'Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiService.getAllUsers();
      // Filter only customers
      const customers = data.filter((u: any) => u.role === 'customer');
      setUsers(customers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const openAddModal = () => {
    setEditingDiscount(null);
    setFormData({
      customer_id: '',
      discount_type: 'percentage',
      discount_value: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setModalVisible(true);
  };

  const openEditModal = (discount: any) => {
    setEditingDiscount(discount);
    setFormData({
      customer_id: discount.customer_id,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value.toString(),
      start_date: new Date(discount.start_date).toISOString().split('T')[0],
      end_date: new Date(discount.end_date).toISOString().split('T')[0],
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    console.log('handleSave called');
    console.log('Form data:', formData);
    
    if (!formData.customer_id || !formData.discount_value || !formData.start_date || !formData.end_date) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const value = parseFloat(formData.discount_value);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Error', 'Please enter valid discount value');
      return;
    }

    if (formData.discount_type === 'percentage' && value > 100) {
      Alert.alert('Error', 'Percentage cannot exceed 100%');
      return;
    }

    setSaving(true);
    try {
      const discountData = {
        customer_id: formData.customer_id,
        discount_type: formData.discount_type,
        discount_value: value,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
      };

      console.log('Sending discount data:', discountData);

      if (editingDiscount) {
        await apiService.updateDiscount(editingDiscount.id, discountData);
        Alert.alert('Success', 'Discount updated successfully');
      } else {
        await apiService.createDiscount(discountData);
        Alert.alert('Success', 'Discount created successfully');
      }

      setModalVisible(false);
      fetchDiscounts();
    } catch (error: any) {
      console.error('Error saving discount:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save discount');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (discountId: string) => {
    Alert.alert(
      'Delete Discount',
      'Are you sure you want to delete this discount?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteDiscount(discountId);
              Alert.alert('Success', 'Discount deleted');
              fetchDiscounts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete discount');
            }
          },
        },
      ]
    );
  };

  const getUserName = (customerId: string) => {
    const user = users.find(u => u.id === customerId);
    return user ? user.username : 'Unknown';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Discounts</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {discounts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={60} color="#999" />
            <Text style={styles.emptyText}>No discounts yet</Text>
          </View>
        ) : (
          discounts.map((discount) => (
            <View key={discount.id} style={styles.discountCard}>
              <View style={styles.discountHeader}>
                <Text style={styles.customerName}>{getUserName(discount.customer_id)}</Text>
                <View style={[styles.badge, discount.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={styles.badgeText}>{discount.is_active ? 'ACTIVE' : 'INACTIVE'}</Text>
                </View>
              </View>

              <View style={styles.discountInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="pricetag" size={18} color="#8B4513" />
                  <Text style={styles.infoText}>
                    {discount.discount_type === 'percentage' 
                      ? `${discount.discount_value}% OFF` 
                      : `₹${discount.discount_value} OFF`}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={18} color="#8B4513" />
                  <Text style={styles.infoText}>
                    {new Date(discount.start_date).toLocaleDateString('en-IN')} - {new Date(discount.end_date).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(discount)}
                >
                  <Ionicons name="create" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(discount.id)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingDiscount ? 'Edit' : 'Add'} Discount</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.form}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Customer *</Text>
              <View style={styles.pickerContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  {users.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[
                        styles.customerChip,
                        formData.customer_id === u.id && styles.customerChipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, customer_id: u.id })}
                    >
                      <Text style={[
                        styles.customerChipText,
                        formData.customer_id === u.id && styles.customerChipTextActive,
                      ]}>
                        {u.username}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Discount Type *</Text>
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.discount_type === 'percentage' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, discount_type: 'percentage' })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    formData.discount_type === 'percentage' && styles.typeButtonTextActive,
                  ]}>
                    Percentage (%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.discount_type === 'fixed' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, discount_type: 'fixed' })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    formData.discount_type === 'fixed' && styles.typeButtonTextActive,
                  ]}>
                    Fixed Amount (₹)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>
                Discount Value * {formData.discount_type === 'percentage' ? '(0-100)' : '(₹)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={formData.discount_type === 'percentage' ? 'e.g. 10' : 'e.g. 50'}
                value={formData.discount_value}
                onChangeText={(text) => setFormData({ ...formData, discount_value: text })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Start Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.start_date}
                onChangeText={(text) => setFormData({ ...formData, start_date: text })}
              />

              <Text style={styles.label}>End Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.end_date}
                onChangeText={(text) => setFormData({ ...formData, end_date: text })}
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingDiscount ? 'Update' : 'Create'} Discount
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8DC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#8B4513',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  addButton: { padding: 5 },
  content: { flex: 1, padding: 15 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 10 },
  discountCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#4CAF50' },
  inactiveBadge: { backgroundColor: '#999' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  discountInfo: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 14, color: '#666' },
  actions: { flexDirection: 'row', gap: 10 },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#8B4513' },
  form: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  pickerContainer: { marginBottom: 15 },
  customerChip: {
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#8B4513',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  customerChipActive: { backgroundColor: '#8B4513' },
  customerChipText: { color: '#8B4513', fontWeight: 'bold' },
  customerChipTextActive: { color: '#fff' },
  typeContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  typeButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#8B4513',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  typeButtonActive: { backgroundColor: '#8B4513' },
  typeButtonText: { color: '#8B4513', fontWeight: 'bold' },
  typeButtonTextActive: { color: '#fff' },
  saveButton: {
    backgroundColor: '#8B4513',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
