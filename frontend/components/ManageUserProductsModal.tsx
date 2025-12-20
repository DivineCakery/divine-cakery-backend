import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';
import { showAlert } from '../utils/alerts';

interface ManageUserProductsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onSaved?: () => void;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

export default function ManageUserProductsModal({
  visible,
  onClose,
  userId,
  username,
  onSaved,
}: ManageUserProductsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hasRestrictions, setHasRestrictions] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all products (with include_admin=true to see all)
      const products = await apiService.getProducts(undefined, undefined, true);
      setAllProducts(products);

      // Fetch user's current allowed products
      const allowedData = await apiService.getUserAllowedProducts(userId);
      const allowedIds = allowedData.allowed_product_ids || [];
      setSelectedProductIds(new Set(allowedIds));
      setHasRestrictions(allowedData.has_restrictions);
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  const selectAll = () => {
    const filteredProducts = getFilteredProducts();
    const newSelected = new Set(selectedProductIds);
    filteredProducts.forEach(p => newSelected.add(p.id));
    setSelectedProductIds(newSelected);
  };

  const clearAll = () => {
    setSelectedProductIds(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const productIds = Array.from(selectedProductIds);
      await apiService.updateUserAllowedProducts(userId, productIds);
      
      const message = productIds.length === 0
        ? `${username} can now see ALL products`
        : `${username} can now see ${productIds.length} products`;
      
      showAlert('Success', message);
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      showAlert('Error', 'Failed to save product restrictions');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredProducts = () => {
    if (!searchQuery) return allProducts;
    const query = searchQuery.toLowerCase();
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isSelected = selectedProductIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.productItem, isSelected && styles.productItemSelected]}
        onPress={() => toggleProduct(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.checkbox}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={24}
            color={isSelected ? '#4CAF50' : '#999'}
          />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category} • ₹{item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredProducts = getFilteredProducts();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Manage Products</Text>
              <Text style={styles.headerSubtitle}>for {username}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B4513" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : (
            <>
              {/* Info Banner */}
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color="#666" />
                <Text style={styles.infoText}>
                  {selectedProductIds.size === 0
                    ? 'No restrictions - user sees all products'
                    : `${selectedProductIds.size} products selected`}
                </Text>
              </View>

              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickActionButton} onPress={selectAll}>
                  <Ionicons name="checkmark-done" size={18} color="#4CAF50" />
                  <Text style={styles.quickActionText}>Select All Visible</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton} onPress={clearAll}>
                  <Ionicons name="remove-circle" size={18} color="#f44336" />
                  <Text style={[styles.quickActionText, { color: '#f44336' }]}>Clear All</Text>
                </TouchableOpacity>
              </View>

              {/* Products List */}
              <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                style={styles.productList}
                contentContainerStyle={styles.productListContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No products found</Text>
                  </View>
                }
              />

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 15,
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    marginHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    gap: 6,
  },
  quickActionText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  productList: {
    flex: 1,
  },
  productListContent: {
    padding: 15,
    paddingBottom: 20,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  productItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  checkbox: {
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  productCategory: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
