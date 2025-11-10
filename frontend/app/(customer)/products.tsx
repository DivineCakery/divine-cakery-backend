import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useCartStore, useAuthStore } from '../../store';
import { DIVINE_WHATSAPP_CUSTOMER_SUPPORT } from '../../constants/whatsapp';

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedCategoryData, setSelectedCategoryData] = useState<any>(null);
  const addItem = useCartStore((state) => state.addItem);
  const { items: cartItems } = useCartStore();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    const hasItemsInCart = cartItems.length > 0;
    
    showAlert(
      'Logout Confirmation',
      hasItemsInCart 
        ? 'You have items in your cart. Are you sure you want to logout? Your cart will be saved.'
        : 'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleContactUs = () => {
    showAlert(
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
                // Fallback to web WhatsApp
                const webUrl = `https://wa.me/${DIVINE_WHATSAPP_CUSTOMER_SUPPORT}`;
                await Linking.openURL(webUrl);
              }
            } catch (error) {
              showAlert('Error', 'Could not open WhatsApp');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchFavorites();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      // Filter out admin-only categories for customers
      const customerCategories = data.filter((cat: any) => !cat.is_admin_only);
      setCategoriesData(customerCategories);
      const categoryNames = customerCategories.map((cat: any) => cat.name);
      setCategories(['All', ...categoryNames]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCategoryPress = (categoryName: string) => {
    if (categoryName === 'All') {
      setSelectedCategory('All');
      return;
    }

    const categoryData = categoriesData.find(cat => cat.name === categoryName);
    
    if (categoryData && categoryData.description) {
      // Show modal with description
      setSelectedCategoryData(categoryData);
      setShowDescriptionModal(true);
    } else {
      // No description, directly select category
      setSelectedCategory(categoryName);
    }
  };

  const handleConfirmCategory = () => {
    if (selectedCategoryData) {
      setSelectedCategory(selectedCategoryData.name);
    }
    setShowDescriptionModal(false);
  };

  // Refresh favorites and categories when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchCategories();
      fetchFavorites();
    }, [])
  );

  useEffect(() => {
    filterProducts();
  }, [products, selectedCategory, searchQuery]);

  const fetchProducts = async () => {
    try {
      const data = await apiService.getProducts(undefined, true);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      showAlert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const favorites = await apiService.getFavorites();
      setFavoriteIds(favorites.map((fav: any) => fav.id));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (productId: string) => {
    try {
      const isFavorite = favoriteIds.includes(productId);
      
      if (isFavorite) {
        await apiService.removeFromFavorites(productId);
        setFavoriteIds(favoriteIds.filter(id => id !== productId));
      } else {
        await apiService.addToFavorites(productId);
        setFavoriteIds([...favoriteIds, productId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showAlert('Error', 'Failed to update favorites');
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((p) => {
        // Support both single category (old) and multiple categories (new)
        if (p.categories && Array.isArray(p.categories)) {
          return p.categories.some((cat: string) => 
            cat.toLowerCase() === selectedCategory.toLowerCase()
          );
        }
        // Fallback to single category field
        return p.category?.toLowerCase() === selectedCategory.toLowerCase();
      });
    }

    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const getCategoryCount = (categoryName: string) => {
    if (categoryName === 'All') {
      return products.length;
    }
    
    return products.filter((p) => {
      if (p.categories && Array.isArray(p.categories)) {
        return p.categories.some((cat: string) => 
          cat.toLowerCase() === categoryName.toLowerCase()
        );
      }
      return p.category?.toLowerCase() === categoryName.toLowerCase();
    }).length;
  };

  const getQuantity = (productId: string) => {
    return quantities[productId] || 1;
  };

  const increaseQuantity = (productId: string) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 1) + 1
    }));
  };

  const decreaseQuantity = (productId: string) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) - 1)
    }));
  };

  const handleAddToCart = (product: any) => {
    const quantity = getQuantity(product.id);
    addItem(product, quantity);
    showAlert('Success', `${quantity} x ${product.name} added to cart`);
    // Reset quantity after adding
    setQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[product.id];
      return newQuantities;
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const renderProduct = ({ item }: any) => {
    const isFavorite = favoriteIds.includes(item.id);
    
    return (
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => toggleFavorite(item.id)}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#FF0000" : "#666"}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          {item.food_type && (
            <View style={[styles.fssaiBadge, item.food_type === 'veg' ? styles.vegBadge : styles.nonVegBadge]}>
              <View style={[styles.fssaiDotCustomer, item.food_type === 'veg' ? styles.vegDotCustomer : styles.nonVegDotCustomer]} />
            </View>
          )}
        </View>
        <Text style={styles.productCategory}>{item.category}</Text>
        {item.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.shelf_life && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.infoText}>Shelf Life: {item.shelf_life}</Text>
          </View>
        )}
        {item.storage_instructions && (
          <View style={styles.infoRow}>
            <Ionicons name="snow-outline" size={14} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>{item.storage_instructions}</Text>
          </View>
        )}
        
        {/* More Details Button */}
        <TouchableOpacity
          style={styles.moreDetailsButton}
          onPress={() => router.push(`/(customer)/product-detail?id=${item.id}`)}
        >
          <Text style={styles.moreDetailsText}>Details with photos</Text>
          <Ionicons name="chevron-forward" size={16} color="#8B4513" />
        </TouchableOpacity>

        <View style={styles.productFooter}>
          <View>
            <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
            <Text style={styles.productUnit}>per {item.unit}</Text>
          </View>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => decreaseQuantity(item.id)}
            >
              <Ionicons name="remove" size={20} color="#8B4513" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{getQuantity(item.id)}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => increaseQuantity(item.id)}
            >
              <Ionicons name="add" size={20} color="#8B4513" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddToCart(item)}
            >
              <Ionicons name="cart" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Divine Cakery</Text>
          <Text style={styles.headerSubtitle}>Wholesale Bakery Products</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleContactUs} style={styles.contactButton}>
            <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
            <Text style={styles.contactButtonText}>Contact Us</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
              onPress={() => handleCategoryPress(item)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item && styles.categoryTextActive,
                ]}
              >
                {item} ({getCategoryCount(item)})
              </Text>
            </TouchableOpacity>
          )}
          style={styles.categoriesContainer}
        />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContainer, cartItems.length > 0 && { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bread-slice-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {cartItems.length > 0 && (
        <View style={styles.proceedButtonContainer}>
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={() => router.push('/(customer)/checkout')}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.proceedButtonText}>
              Proceed to Buy ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Category Description Modal */}
      <Modal
        visible={showDescriptionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDescriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.descriptionModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedCategoryData?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowDescriptionModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.descriptionText}>
                {selectedCategoryData?.description}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewProductsButton}
              onPress={handleConfirmCategory}
            >
              <Text style={styles.viewProductsButtonText}>
                View Products
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
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
    padding: 8,
    paddingTop: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#FFF8DC',
    marginTop: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
  },
  categoriesWrapper: {
    backgroundColor: '#FFF8DC',
    paddingBottom: 8,
    marginBottom: 5,
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    paddingTop: 5,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#8B4513',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
    elevation: 2,
    shadowOpacity: 0.25,
  },
  categoryText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
    paddingTop: 8,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  productImage: {
    width: '100%',
    height: 160,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 11,
    color: '#8B4513',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  productUnit: {
    fontSize: 12,
    color: '#999',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF8DC',
    borderWidth: 1,
    borderColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    marginLeft: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
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
  proceedButtonContainer: {
    position: 'absolute',
    bottom: 75,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  proceedButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  descriptionModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  modalBody: {
    marginVertical: 15,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
  },
  viewProductsButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  viewProductsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  fssaiBadge: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegBadge: {
    borderColor: '#00A651',
    backgroundColor: '#fff',
  },
  nonVegBadge: {
    borderColor: '#8B4513',
    backgroundColor: '#fff',
  },
  fssaiDotCustomer: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  vegDotCustomer: {
    backgroundColor: '#00A651',
  },
  nonVegDotCustomer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#8B4513',
    borderRadius: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  moreDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  moreDetailsText: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '600',
    marginRight: 4,
  },
});
