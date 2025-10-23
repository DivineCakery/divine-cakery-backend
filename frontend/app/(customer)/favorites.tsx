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
  Alert,
} from 'react-native';
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
  
  const addToCart = useCartStore((state) => state.addToCart);
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
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
      Alert.alert('Error', 'Failed to load favorites');
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
      Alert.alert('Success', 'Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove from favorites');
    }
  };

  const handleAddToCart = (product: any) => {
    const quantity = getQuantity(product.id);
    addToCart(product, quantity);
    Alert.alert('Success', `${quantity} x ${product.name} added to cart`);
    setQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[product.id];
      return newQuantities;
    });
  };

  const renderFavoriteItem = ({ item }: any) => (
    <View style={styles.productCard}>
      <View style={styles.imageContainer}>
        {item.image_base64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <MaterialCommunityIcons name="food" size={40} color="#ccc" />
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
        <Text style={styles.productName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.packet_size && (
          <Text style={styles.packetSize}>{item.packet_size}</Text>
        )}
        <View style={styles.priceRow}>
          {item.mrp > item.price && (
            <Text style={styles.mrpText}>₹{item.mrp.toFixed(2)}</Text>
          )}
          <Text style={styles.priceText}>₹{item.price.toFixed(2)}</Text>
          <Text style={styles.unitText}>/{item.unit}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => decreaseQuantity(item.id)}
          >
            <MaterialCommunityIcons name="minus" size={20} color="#8B4513" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{getQuantity(item.id)}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => increaseQuantity(item.id)}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#8B4513" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddToCart(item)}
        >
          <MaterialCommunityIcons name="cart-plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
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
        <Ionicons name="heart" size={24} color="#fff" />
        <Text style={styles.headerTitle}>My Favorites</Text>
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
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContainer: {
    padding: 15,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  packetSize: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mrpText: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  unitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 0,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    borderRadius: 10,
    padding: 5,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
