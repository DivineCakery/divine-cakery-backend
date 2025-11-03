import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useAuthStore } from '../../store';
import { showAlert } from '../../utils/alerts';

export default function ManageStockScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<string>('');

  useFocusEffect(
    React.useCallback(() => {
      fetchCategories();
      fetchProducts();
    }, [])
  );

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      // Filter only admin categories
      const adminCategories = data.filter((cat: any) => 
        ['Packing', 'Slicing', 'Prep'].includes(cat.name)
      );
      setCategories(adminCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiService.getProducts();
      setProducts(data);
      filterProducts(data, selectedCategory);
    } catch (error) {
      showAlert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterProducts = (productList: any[], category: string | null) => {
    if (!category) {
      setFilteredProducts(productList);
    } else {
      const filtered = productList.filter((product: any) => {
        // Check both old 'category' field and new 'categories' array
        if (product.categories && Array.isArray(product.categories)) {
          return product.categories.includes(category);
        }
        return product.category === category;
      });
      setFilteredProducts(filtered);
    }
  };

  const handleCategoryFilter = (category: string) => {
    if (selectedCategory === category) {
      // Deselect if already selected
      setSelectedCategory(null);
      filterProducts(products, null);
    } else {
      setSelectedCategory(category);
      filterProducts(products, category);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const updateClosingStock = async (productId: string, newStock: number) => {
    try {
      await apiService.updateProduct(productId, { closing_stock: newStock });
      await fetchProducts();
      showAlert('Success', 'Stock updated successfully');
    } catch (error) {
      showAlert('Error', 'Failed to update closing stock');
    }
  };

  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const renderProduct = ({ item }: any) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        {item.image_base64 ? (
          <Image 
            source={{ uri: item.image_base64 }} 
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.noImage]}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₹{item.price.toFixed(2)} / {item.unit}</Text>
        </View>
      </View>

      <View style={styles.stockContainer}>
        <Text style={styles.stockLabel}>Closing Stock:</Text>
        <View style={styles.stockInputContainer}>
          <TouchableOpacity
            style={styles.stockButton}
            onPress={() => {
              const newStock = Math.max(0, (item.closing_stock || 0) - 1);
              updateClosingStock(item.id, newStock);
            }}
          >
            <Ionicons name="remove" size={20} color="#8B4513" />
          </TouchableOpacity>
          
          {editingStockId === item.id ? (
            <>
              <TextInput
                style={styles.stockInput}
                value={tempStockValue}
                onChangeText={setTempStockValue}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  const newStock = parseInt(tempStockValue) || 0;
                  if (newStock >= 0) {
                    updateClosingStock(item.id, newStock);
                  }
                  setEditingStockId(null);
                  setTempStockValue('');
                }}
              >
                <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditingStockId(null);
                  setTempStockValue('');
                }}
              >
                <Ionicons name="close-circle" size={28} color="#f44336" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.stockValueButton}
              onPress={() => {
                setEditingStockId(item.id);
                setTempStockValue(String(item.closing_stock || 0));
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.stockValue}>{item.closing_stock || 0} {item.unit || 'units'}</Text>
              <Ionicons name="pencil" size={12} color="#2e7d32" style={{marginLeft: 4}} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.stockButton}
            onPress={() => {
              const newStock = (item.closing_stock || 0) + 1;
              updateClosingStock(item.id, newStock);
            }}
          >
            <Ionicons name="add" size={20} color="#8B4513" />
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Manage Stock</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Admin Category:</Text>
          <View style={styles.categoryFilterContainer}>
            {categories.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  selectedCategory === cat.name && styles.filterChipActive,
                ]}
                onPress={() => handleCategoryFilter(cat.name)}
              >
                <Ionicons 
                  name={selectedCategory === cat.name ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={selectedCategory === cat.name ? "#fff" : "#FF6B00"} 
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === cat.name && styles.filterChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
            {selectedCategory && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => handleCategoryFilter(selectedCategory)}
              >
                <Text style={styles.clearFilterText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>
          {selectedCategory && (
            <Text style={styles.filterResultText}>
              Showing {filteredProducts.length} product(s) in "{selectedCategory}"
            </Text>
          )}
        </View>
      )}

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
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {selectedCategory 
                ? `No products in "${selectedCategory}" category`
                : 'No products available'
              }
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8DC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8DC' },
  header: { backgroundColor: '#8B4513', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  logoutButton: { padding: 5 },
  listContainer: { padding: 15, paddingBottom: 100 },
  productCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  productHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  productImage: { width: 60, height: 60, borderRadius: 8 },
  noImage: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  productInfo: { marginLeft: 15, flex: 1 },
  productName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  productCategory: { fontSize: 12, color: '#8B4513', marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '600', color: '#666', marginTop: 4 },
  stockContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8 },
  stockLabel: { fontSize: 14, fontWeight: '600', color: '#2e7d32' },
  stockInputContainer: { flexDirection: 'row', alignItems: 'center' },
  stockButton: { backgroundColor: '#fff', padding: 8, borderRadius: 6, marginHorizontal: 5, elevation: 1 },
  stockValueButton: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    justifyContent: 'center',
  },
  stockValue: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', textAlign: 'center' },
  stockInput: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#2e7d32', 
    minWidth: 80, 
    textAlign: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#2e7d32',
  },
  saveButton: {
    marginLeft: 8,
  },
  cancelButton: {
    marginLeft: 4,
  },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 10 },
});
