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
  Alert,
  Linking,
} from 'react-native';
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const addItem = useCartStore((state) => state.addItem);
  const { items: cartItems } = useCartStore();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    const hasItemsInCart = cartItems.length > 0;
    
    Alert.alert(
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
                // Fallback to web WhatsApp
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

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchFavorites();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      const categoryNames = data.map((cat: any) => cat.name);
      setCategories(['All', ...categoryNames]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
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
      Alert.alert('Error', 'Failed to load products');
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
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
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
    Alert.alert('Success', `${quantity} x ${product.name} added to cart`);
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
        <View style={styles.imageContainer}>
          {item.image_base64 ? (
            <Image
              source={{ uri: item.image_base64 }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <MaterialCommunityIcons name="bread-slice" size={50} color="#8B4513" />
            </View>
          )}
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
        <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        {item.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
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
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item && styles.categoryTextActive,
                ]}
              >
                {item}
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
            <Ionicons name="cart" size={24} color="#fff" />
            <Text style={styles.proceedButtonText}>
              Proceed to Buy ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
            </Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
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
    padding: 12,
    paddingTop: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFF8DC',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  logoutButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  categoriesWrapper: {
    backgroundColor: '#FFF8DC',
    paddingBottom: 15,
    marginBottom: 10,
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    marginBottom: 25,
    marginTop: 10,
    paddingBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#8B4513',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
    elevation: 4,
    shadowOpacity: 0.3,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
    paddingTop: 25,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: 200,
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
    padding: 15,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productCategory: {
    fontSize: 12,
    color: '#8B4513',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 24,
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
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  proceedButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
});
