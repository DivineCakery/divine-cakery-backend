import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useCartStore, useAuthStore } from '../../store';

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  
  const addItem = useCartStore((state) => state.addItem);
  const { logout } = useAuthStore();

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  // Refresh favorites when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const fetchFavorites = async () => {
    try {
      const data = await apiService.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      showAlert('Error', 'Failed to load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
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

  const handleRemoveFromFavorites = async (productId: string) => {
    try {
      await apiService.removeFromFavorites(productId);
      setFavorites(favorites.filter((item: any) => item.id !== productId));
      showAlert('Success', 'Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      showAlert('Error', 'Failed to remove from favorites');
    }
  };

  const handleAddToCart = (product: any) => {
    const quantity = getQuantity(product.id);
    addToCart(product, quantity);
    showAlert('Success', `${quantity} x ${product.name} added to cart`);
    setQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[product.id];
      return newQuantities;
    });
  };

  const renderFavoriteItem = ({ item }: any) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        onPress={() => router.push(`/(customer)/product-detail?id=${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          {item.image_base64 ? (
            <Image
              source={{ uri: item.image_base64 }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => handleRemoveFromFavorites(item.id)}
          >
            <Ionicons name="heart" size={24} color="#FF0000" />
          </TouchableOpacity>
        </View>

        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.food_type && (
              <View style={[styles.fssaiBadge, item.food_type === 'veg' ? styles.vegBadge : styles.nonVegBadge]}>
                <View style={[styles.fssaiDot, item.food_type === 'veg' ? styles.vegDot : styles.nonVegDot]} />
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
            <Text style={styles.moreDetailsText}>More Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#8B4513" />
          </TouchableOpacity>

          <View style={styles.productFooter}>
            <View>
              <View style={styles.priceRow}>
                {item.mrp && item.mrp > item.price && (
                  <Text style={styles.mrpText}>₹{item.mrp.toFixed(2)}</Text>
                )}
                <Text style={styles.priceText}>₹{item.price.toFixed(2)}</Text>
              </View>
              <Text style={styles.unitText}>per {item.unit}</Text>
            </View>
            <View style={styles.actionButtons}>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => decreaseQuantity(item.id)}
                >
                  <Ionicons name="remove" size={16} color="#8B4513" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{getQuantity(item.id)}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => increaseQuantity(item.id)}
                >
                  <Ionicons name="add" size={16} color="#8B4513" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddToCart(item)}
              >
                <Ionicons name="cart" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
        <View style={styles.headerLeft}>
          <Ionicons name="heart" size={24} color="#fff" />
          <Text style={styles.headerTitle}>My Favorites</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={favorites}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>Tap the heart icon on products to save them here</Text>
          </View>
        }
      />
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
    paddingTop: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 6,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
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
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  productInfo: {
    padding: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
  fssaiDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  vegDot: {
    backgroundColor: '#00A651',
  },
  nonVegDot: {
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
    transform: [{ rotate: '180deg' }],
  },
  productCategory: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
  },
  productDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
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
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 5,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  moreDetailsText: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '600',
    marginRight: 4,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  mrpText: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  unitText: {
    fontSize: 11,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#8B4513',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
