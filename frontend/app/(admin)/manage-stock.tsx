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
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<string>('');
  const [resetHistory, setResetHistory] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showFullHistory, setShowFullHistory] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchCategories();
      fetchProducts();
      fetchResetHistory();
    }, [])
  );

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      // Get admin-only categories OR categories used for stock management
      // Include both is_admin_only categories and legacy Packing/Slicing/Prep
      const adminCategories = data.filter((cat: any) => 
        cat.is_admin_only === true || ['Packing', 'Slicing', 'Prep'].includes(cat.name)
      );
      
      // If no admin categories found, show all product categories for stock management
      if (adminCategories.length === 0) {
        // Use all product categories (not dough types)
        const productCategories = data.filter((cat: any) => 
          cat.category_type !== 'dough_type'
        );
        setCategories(productCategories);
      } else {
        setCategories(adminCategories);
      }
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

  const filterProducts = (productList: any[], category: string | null, search: string = searchQuery) => {
    let filtered = productList;
    
    // Category filter
    if (category) {
      filtered = filtered.filter((product: any) => {
        // Check both old 'category' field and new 'categories' array
        if (product.categories && Array.isArray(product.categories)) {
          return product.categories.includes(category);
        }
        return product.category === category;
      });
    }
    
    // Search filter
    if (search) {
      filtered = filtered.filter((product: any) =>
        product.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  };

  const handleCategoryFilter = (category: string) => {
    if (selectedCategory === category) {
      // Deselect if already selected
      setSelectedCategory(null);
      filterProducts(products, null, searchQuery);
    } else {
      setSelectedCategory(category);
      filterProducts(products, category, searchQuery);
    }
  };

  // Re-filter when search query changes
  useEffect(() => {
    filterProducts(products, selectedCategory, searchQuery);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Helper function to convert to IST
  const formatISTDateTime = (inputDate?: string | Date) => {
    let date: Date;
    
    if (!inputDate) {
      // Use current date/time
      date = new Date();
    } else if (typeof inputDate === 'string') {
      // Parse string date - handle both ISO and other formats
      // Add 'Z' if not present to ensure UTC parsing
      const dateStr = inputDate.includes('Z') ? inputDate : inputDate + 'Z';
      date = new Date(dateStr);
    } else {
      date = inputDate;
    }
    
    // Validate date
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', inputDate);
      return { dateStr: 'Invalid Date', timeStr: 'Invalid Time' };
    }
    
    // Format in IST timezone (Asia/Kolkata = UTC+5:30)
    const dateStr = new Intl.DateTimeFormat('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    }).format(date);
    
    const timeStr = new Intl.DateTimeFormat('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(date);
    
    return { dateStr, timeStr };
  };

  const fetchResetHistory = async () => {
    try {
      const history = await apiService.getStockResetHistory(30);
      setResetHistory(history);
    } catch (error) {
      console.error('Error fetching reset history:', error);
    }
  };

  const updateClosingStock = async (productId: string, newStock: number) => {
    try {
      await apiService.updateProduct(productId, { closing_stock: newStock });
      await fetchProducts();
      // Removed success alert as per requirement
    } catch (error) {
      showAlert('Error', 'Failed to update closing stock');
    }
  };

  const handleResetAllStock = () => {
    showAlert(
      'Reset All Stock',
      'This will set ALL products stock to 0. This action will be recorded. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to 0',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await apiService.resetAllStock();
              await fetchProducts();
              await fetchResetHistory();
              setSelectAll(false);
              setSelectedProducts([]);
              setLoading(false);
              showAlert('Success', 'All stock reset to 0 successfully');
            } catch (error) {
              setLoading(false);
              showAlert('Error', 'Failed to reset stock');
            }
          }
        }
      ]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p: any) => p.id));
    }
    setSelectAll(!selectAll);
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
    <View style={styles.compactProductCard}>
      <View style={styles.compactProductInfo}>
        <Text style={styles.compactProductName}>
          {item.name} - ₹{item.price.toFixed(2)}
        </Text>
      </View>

      <View style={styles.compactStockContainer}>
        <TouchableOpacity
          style={styles.compactStockButton}
          onPress={() => {
            const newStock = Math.max(0, (item.closing_stock || 0) - 1);
            updateClosingStock(item.id, newStock);
          }}
        >
          <Ionicons name="remove" size={18} color="#8B4513" />
        </TouchableOpacity>
        
        {editingStockId === item.id ? (
          <>
            <TextInput
              style={styles.compactStockInput}
              value={tempStockValue}
              onChangeText={setTempStockValue}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.compactSaveButton}
              onPress={() => {
                const newStock = parseInt(tempStockValue) || 0;
                if (newStock >= 0) {
                  updateClosingStock(item.id, newStock);
                }
                setEditingStockId(null);
                setTempStockValue('');
              }}
            >
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactCancelButton}
              onPress={() => {
                setEditingStockId(null);
                setTempStockValue('');
              }}
            >
              <Ionicons name="close-circle" size={24} color="#f44336" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.compactStockValueButton}
            onPress={() => {
              setEditingStockId(item.id);
              setTempStockValue(String(item.closing_stock || 0));
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.compactStockValue}>{item.closing_stock || 0}</Text>
            <Ionicons name="pencil" size={10} color="#666" style={{marginLeft: 3}} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.compactStockButton}
          onPress={() => {
            const newStock = (item.closing_stock || 0) + 1;
            updateClosingStock(item.id, newStock);
          }}
        >
          <Ionicons name="add" size={18} color="#8B4513" />
        </TouchableOpacity>
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

      {/* Date and Reset History */}
      <View style={styles.dateContainer}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar" size={18} color="#8B4513" />
          <Text style={styles.dateText}>
            {formatISTDateTime().dateStr} - {formatISTDateTime().timeStr}
          </Text>
        </View>
        {resetHistory.length > 0 && (
          <>
            <TouchableOpacity 
              style={styles.historyRow}
              onPress={() => setShowFullHistory(!showFullHistory)}
              activeOpacity={0.7}
            >
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.historyText}>
                Last Reset: {formatISTDateTime(resetHistory[0].reset_date).dateStr}, {formatISTDateTime(resetHistory[0].reset_date).timeStr} by {resetHistory[0].reset_by} ({resetHistory[0].products_count} products)
              </Text>
              <Ionicons 
                name={showFullHistory ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#666" 
              />
            </TouchableOpacity>
            
            {showFullHistory && (
              <View style={styles.fullHistoryContainer}>
                <Text style={styles.fullHistoryTitle}>Reset History (Last 30 days)</Text>
                {resetHistory.map((event: any, index: number) => {
                  const { dateStr, timeStr } = formatISTDateTime(event.reset_date);
                  return (
                    <View key={event.id} style={styles.historyItem}>
                      <View style={styles.historyItemLeft}>
                        <Text style={styles.historyItemNumber}>{index + 1}.</Text>
                        <View>
                          <Text style={styles.historyItemDate}>{dateStr} at {timeStr}</Text>
                          <Text style={styles.historyItemDetails}>
                            By {event.reset_by} • {event.products_count} products
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>

      {/* Select All and Reset Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.selectAllButton}
          onPress={toggleSelectAll}
        >
          <Ionicons 
            name={selectAll ? "checkbox" : "square-outline"} 
            size={24} 
            color="#8B4513" 
          />
          <Text style={styles.selectAllText}>Select All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.resetAllButton}
          onPress={handleResetAllStock}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.resetAllText}>Reset All Stock to 0</Text>
        </TouchableOpacity>
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
  header: { backgroundColor: '#8B4513', padding: 15, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  logoutButton: { padding: 5 },
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
  filterContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFF8DC',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  filterChipActive: {
    backgroundColor: '#FF6B00',
  },
  filterChipText: {
    fontSize: 13,
    color: '#FF6B00',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f44336',
  },
  clearFilterText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  filterResultText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 8,
    fontWeight: '600',
  },
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
  
  // Compact styles
  compactProductCard: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 10, 
    marginBottom: 8, 
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactProductInfo: { 
    flex: 1, 
    marginRight: 10,
  },
  compactProductName: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333',
  },
  compactStockContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    padding: 6,
  },
  compactStockButton: { 
    backgroundColor: '#fff', 
    padding: 6, 
    borderRadius: 4, 
    marginHorizontal: 3, 
    elevation: 1,
  },
  compactStockValueButton: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 50,
    justifyContent: 'center',
  },
  compactStockValue: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#2e7d32', 
    textAlign: 'center',
  },
  compactStockInput: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#2e7d32', 
    minWidth: 50, 
    textAlign: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: '#2e7d32',
  },
  compactSaveButton: {
    marginLeft: 6,
  },
  compactCancelButton: {
    marginLeft: 3,
  },
  
  // Date and History styles
  dateContainer: {
    backgroundColor: '#FFF8DC',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginLeft: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  historyText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  fullHistoryContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  fullHistoryTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyItemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  historyItemNumber: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
    width: 20,
  },
  historyItemDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  historyItemDetails: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  
  // Controls styles
  controlsContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 8,
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },
  resetAllText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
