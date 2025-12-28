import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

type CategoryType = 'product_category' | 'dough_type';

export default function ManageCategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<CategoryType>('product_category');
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    display_order: 0, 
    is_admin_only: false,
    category_type: 'product_category' as CategoryType
  });

  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories(activeTab);
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showAlert('Error', 'Failed to fetch categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData({ 
      name: '', 
      description: '', 
      display_order: categories.length, 
      is_admin_only: false,
      category_type: activeTab
    });
    setShowModal(true);
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({ 
      name: category.name, 
      description: category.description || '', 
      display_order: category.display_order,
      is_admin_only: category.is_admin_only || false,
      category_type: category.category_type || 'product_category'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('Error', `${activeTab === 'dough_type' ? 'Dough type' : 'Category'} name is required`);
      return;
    }

    try {
      const saveData = {
        ...formData,
        category_type: activeTab
      };
      
      if (editingCategory) {
        await apiService.updateCategory(editingCategory.id, saveData);
        showAlert('Success', `${activeTab === 'dough_type' ? 'Dough type' : 'Category'} updated successfully`);
      } else {
        await apiService.createCategory(saveData);
        showAlert('Success', `${activeTab === 'dough_type' ? 'Dough type' : 'Category'} created successfully`);
      }
      setShowModal(false);
      fetchCategories();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || `Failed to save ${activeTab === 'dough_type' ? 'dough type' : 'category'}`);
    }
  };

  const handleDelete = (category: any) => {
    const isDoughType = activeTab === 'dough_type';
    const itemName = isDoughType ? 'Dough Type' : 'Category';
    const isAdminCategory = category.is_admin_only;
    
    const title = isAdminCategory ? `⚠️ Delete Admin ${itemName}` : `Delete ${itemName}`;
    const message = isAdminCategory 
      ? `WARNING: "${category.name}" is an ADMIN-ONLY ${itemName.toLowerCase()} (not visible to customers).\n\nThis ${itemName.toLowerCase()} is used for internal operations. Deleting it may affect admin functionality.\n\nAre you absolutely sure you want to delete it?`
      : `Are you sure you want to delete "${category.name}"?`;
    
    showAlert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteCategory(category.id);
              showAlert('Success', `${itemName} deleted successfully`);
              fetchCategories();
            } catch (error: any) {
              showAlert('Error', error.response?.data?.detail || `Failed to delete ${itemName.toLowerCase()}`);
            }
          },
        },
      ]
    );
  };

  const renderCategory = ({ item }: { item: any }) => {
    const isAdminCategory = item.is_admin_only;
    const isDoughType = activeTab === 'dough_type';
    
    return (
      <View style={styles.categoryCard}>
        <View style={styles.categoryInfo}>
          <View style={styles.categoryNameRow}>
            {isDoughType && (
              <View style={styles.doughTypeBadge}>
                <Ionicons name="disc" size={14} color="#8B4513" />
              </View>
            )}
            <Text style={styles.categoryName}>{item.name}</Text>
            {isAdminCategory && (
              <View style={styles.adminBadge}>
                <Ionicons name="lock-closed" size={12} color="#fff" />
                <Text style={styles.adminBadgeText}>ADMIN ONLY</Text>
              </View>
            )}
          </View>
          <Text style={styles.categoryOrder}>Display Order: {item.display_order}</Text>
          {item.description && (
            <Text style={styles.categoryDescription}>{item.description}</Text>
          )}
          {isAdminCategory && (
            <Text style={styles.adminNote}>Not visible to customers</Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="create" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteButton, isAdminCategory && styles.dangerDeleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
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
        <Text style={styles.headerTitle}>Manage Categories</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'product_category' && styles.activeTab]}
          onPress={() => {
            setActiveTab('product_category');
            setLoading(true);
          }}
        >
          <Ionicons name="pricetags" size={18} color={activeTab === 'product_category' ? '#fff' : '#8B4513'} />
          <Text style={[styles.tabText, activeTab === 'product_category' && styles.activeTabText]}>
            Product Categories
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dough_type' && styles.activeTab]}
          onPress={() => {
            setActiveTab('dough_type');
            setLoading(true);
          }}
        >
          <Ionicons name="disc" size={18} color={activeTab === 'dough_type' ? '#fff' : '#8B4513'} />
          <Text style={[styles.tabText, activeTab === 'dough_type' && styles.activeTabText]}>
            Dough Types
          </Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={styles.descriptionBox}>
        <Ionicons 
          name={activeTab === 'dough_type' ? 'information-circle' : 'albums-outline'} 
          size={20} 
          color="#8B4513" 
        />
        <Text style={styles.descriptionText}>
          {activeTab === 'dough_type' 
            ? 'Dough types are used to group products for preparation planning. Assign dough types to products to filter reports.'
            : 'Product categories organize your products for customer browsing. Products can belong to multiple categories.'}
        </Text>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'dough_type' ? 'disc-outline' : 'albums-outline'} 
              size={80} 
              color="#ccc" 
            />
            <Text style={styles.emptyText}>
              No {activeTab === 'dough_type' ? 'dough types' : 'categories'} found
            </Text>
            <Text style={styles.emptySubtext}>
              Tap + to add your first {activeTab === 'dough_type' ? 'dough type' : 'category'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategory 
                ? `Edit ${activeTab === 'dough_type' ? 'Dough Type' : 'Category'}` 
                : `Add ${activeTab === 'dough_type' ? 'Dough Type' : 'Category'}`}
            </Text>

            <Text style={styles.label}>{activeTab === 'dough_type' ? 'Dough Type' : 'Category'} Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder={activeTab === 'dough_type' ? 'e.g., Brioche, Sourdough' : 'e.g., Cakes, Breads'}
              autoFocus={true}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder={activeTab === 'dough_type' ? 'Describe this dough type...' : 'Describe this category for customers...'}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Display Order</Text>
            <TextInput
              style={styles.input}
              value={String(formData.display_order)}
              onChangeText={(text) => setFormData({ ...formData, display_order: parseInt(text) || 0 })}
              placeholder="0"
              keyboardType="numeric"
            />

            {activeTab === 'product_category' && (
              <View style={styles.switchContainer}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.switchLabel}>Admin Display Only</Text>
                  <Text style={styles.switchSubLabel}>
                    Hide this category from customers (visible only to admin)
                  </Text>
                </View>
                <Switch
                  value={formData.is_admin_only}
                  onValueChange={(value) => setFormData({ ...formData, is_admin_only: value })}
                  trackColor={{ false: '#ccc', true: '#8B4513' }}
                  thumbColor={formData.is_admin_only ? '#fff' : '#f4f3f4'}
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSave}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 5,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#8B4513',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B4513',
  },
  activeTabText: {
    color: '#fff',
  },
  descriptionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
    gap: 10,
  },
  descriptionText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  categoryCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  doughTypeBadge: {
    backgroundColor: '#FFF3E0',
    padding: 4,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  adminNote: {
    fontSize: 12,
    color: '#FF6B00',
    fontStyle: 'italic',
    marginTop: 2,
  },
  categoryOrder: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerDeleteButton: {
    backgroundColor: '#D32F2F',
    borderWidth: 2,
    borderColor: '#FF6B00',
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
    color: '#bbb',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
