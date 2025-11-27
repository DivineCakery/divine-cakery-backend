import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useAuthStore } from '../../store';

export default function ManageProductsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const accessLevel = user?.admin_access_level || 'full';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await apiService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      showAlert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      console.log('Fetched categories:', data);
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Filter products based on selected category and search query
  const filteredProducts = products.filter((product: any) => {
    // Category filter
    const categoryMatch = selectedCategory === 'All' || 
      (product.categories && Array.isArray(product.categories)
        ? product.categories.some((cat: string) => 
            cat.toLowerCase() === selectedCategory.toLowerCase()
          )
        : product.category?.toLowerCase() === selectedCategory.toLowerCase());
    
    // Search filter
    const searchMatch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && searchMatch;
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleEditSelected = () => {
    if (!selectedProductId) return;
    router.push(`/(admin)/product-form?id=${selectedProductId}` as any);
  };

  const handleDuplicateSelected = () => {
    if (!selectedProductId) return;
    router.push(`/(admin)/product-form?duplicate=${selectedProductId}` as any);
  };

  const handleToggleSelected = async () => {
    if (!selectedProductId) return;
    
    const product = products.find((p: any) => p.id === selectedProductId);
    if (!product) return;

    try {
      await apiService.updateProduct(selectedProductId, { is_available: !product.is_available });
      await fetchProducts();
      showAlert('Success', `Product ${product.is_available ? 'hidden' : 'made available'}`);
    } catch (error) {
      showAlert('Error', 'Failed to update product');
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedProductId) return;

    showAlert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteProduct(selectedProductId);
              setSelectedProductId(null);
              await fetchProducts();
              showAlert('Success', 'Product deleted successfully');
            } catch (error) {
              showAlert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }: any) => {
    const isSelected = selectedProductId === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.compactProductCard, isSelected && styles.selectedCard]}
        onPress={() => setSelectedProductId(isSelected ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.radioContainer}>
          <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
            {isSelected && <View style={styles.radioButtonInner} />}
          </View>
        </View>
        
        <View style={styles.compactProductInfo}>
          <Text style={styles.compactProductName}>
            {item.name} - ₹{item.price.toFixed(2)}{item.packet_size ? ` - ${item.packet_size}` : ''}
          </Text>
        </View>
        
        <View style={[
          styles.availabilityIndicator,
          item.is_available ? styles.availableIndicator : styles.unavailableIndicator
        ]} />
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
        <Text style={styles.headerTitle}>Manage Products</Text>
        {accessLevel !== 'limited' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(admin)/product-form')}
          >
            <Ionicons name="add-circle" size={32} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
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

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Category:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === 'All' && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('All')}
          >
            <Text style={[styles.categoryChipText, selectedCategory === 'All' && styles.categoryChipTextActive]}>
              All ({products.length})
            </Text>
          </TouchableOpacity>
          {categories.map((category: any) => {
            // Count products that include this category in their categories array
            const count = products.filter((p: any) => {
              if (p.categories && Array.isArray(p.categories)) {
                return p.categories.includes(category.name);
              }
              return p.category === category.name;
            }).length;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryChip, selectedCategory === category.name && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <Text style={[styles.categoryChipText, selectedCategory === category.name && styles.categoryChipTextActive]}>
                  {category.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Action Buttons - Show when product is selected */}
      {selectedProductId && accessLevel !== 'limited' && (() => {
        const selectedProduct = products.find((p: any) => p.id === selectedProductId);
        const isAvailable = selectedProduct?.is_available;
        
        return (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleEditSelected}
            >
              <Ionicons name="create" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.duplicateButton]}
              onPress={handleDuplicateSelected}
            >
              <Ionicons name="copy" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.toggleButton]}
              onPress={handleToggleSelected}
            >
              <Ionicons name={isAvailable ? "eye-off" : "eye"} size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {isAvailable ? "Mark Unavailable" : "Mark Available"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={handleDeleteSelected}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bread-slice-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No products yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8DC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8DC' },
  header: { backgroundColor: '#8B4513', padding: 15, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addButton: { padding: 5 },
  listContainer: { padding: 15, paddingBottom: 100 },
  productCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  productHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  productImage: { width: 60, height: 60, borderRadius: 8 },
  noImage: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  productInfo: { marginLeft: 15, flex: 1 },
  productName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  productCategory: { fontSize: 12, color: '#8B4513', marginTop: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, backgroundColor: '#FFF8DC', padding: 10, borderRadius: 8 },
  priceLabel: { fontSize: 11, color: '#666', marginBottom: 3 },
  mrpPrice: { fontSize: 14, color: '#666', textDecorationLine: 'line-through' },
  productPrice: { fontSize: 18, fontWeight: 'bold', color: '#8B4513' },
  packetSize: { fontSize: 14, color: '#333', fontWeight: '600' },
  productDescription: { fontSize: 14, color: '#666', marginBottom: 10 },
  remarksContainer: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, marginBottom: 10 },
  remarksLabel: { fontSize: 11, color: '#999', marginBottom: 3 },
  remarksText: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  productActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editButton: { flexDirection: 'row', backgroundColor: '#2196F3', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  editButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
  availabilityButton: { flex: 1, padding: 8, borderRadius: 8, marginHorizontal: 8 },
  availableButton: { backgroundColor: '#4CAF50' },
  unavailableButton: { backgroundColor: '#f44336' },
  availabilityText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  deleteButton: { backgroundColor: '#ff3b30', padding: 10, borderRadius: 8, width: 45, alignItems: 'center' },
  viewOnlyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  viewOnlyText: { fontSize: 14, color: '#666', marginLeft: 6, fontStyle: 'italic' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 10 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 5,
    paddingHorizontal: 15,
    borderRadius: 10,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: { backgroundColor: '#fff', padding: 15, marginHorizontal: 15, marginTop: 5, borderRadius: 10, elevation: 1 },
  filterLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  categoryScroll: { flexDirection: 'row' },
  categoryChip: { backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  categoryChipActive: { backgroundColor: '#8B4513', borderColor: '#8B4513' },
  categoryChipText: { fontSize: 14, color: '#666', fontWeight: '500' },
  categoryChipTextActive: { color: '#fff', fontWeight: 'bold' },
  // Compact product card styles
  compactProductCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 8,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCard: {
    borderColor: '#8B4513',
    borderWidth: 2,
    backgroundColor: '#FFF8DC',
  },
  radioContainer: {
    marginRight: 15,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#8B4513',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B4513',
  },
  compactProductInfo: {
    flex: 1,
  },
  compactProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  availabilityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  availableIndicator: {
    backgroundColor: '#4CAF50',
  },
  unavailableIndicator: {
    backgroundColor: '#f44336',
  },
  // Action buttons styles
  actionButtonsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 10,
    marginTop: 5,
    padding: 8,
    borderRadius: 8,
    elevation: 2,
    justifyContent: 'space-around',
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  duplicateButton: {
    backgroundColor: '#2196F3',
  },
  toggleButton: {
    backgroundColor: '#FF9800',
  },
  deleteActionButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 3,
    fontSize: 11,
  },
});
