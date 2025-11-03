import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useCartStore } from '../../store';
import { showAlert } from '../../utils/alerts';

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const data = await apiService.getProduct(productId);
      setProduct(data);
    } catch (error) {
      showAlert('Error', 'Failed to load product details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        unit: product.unit,
      });
      showAlert('Success', `${quantity} ${product.unit}(s) of ${product.name} added to cart`, [
        { text: 'Continue Shopping', onPress: () => router.back() },
        { text: 'View Cart', onPress: () => router.push('/(customer)/cart') },
      ]);
    }
  };

  const increaseQuantity = () => setQuantity(quantity + 1);
  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerContainer}>
        <Text>Product not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#8B4513" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.image_base64 ? (
            <Image
              source={{ uri: product.image_base64 }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={80} color="#8B4513" />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.food_type && (
              <View style={[styles.fssaiBadge, product.food_type === 'veg' ? styles.vegBadge : styles.nonVegBadge]}>
                <View style={[styles.fssaiDot, product.food_type === 'veg' ? styles.vegDot : styles.nonVegDot]} />
              </View>
            )}
          </View>

          <Text style={styles.category}>Category: {product.category}</Text>

          {/* Price Section */}
          <View style={styles.priceContainer}>
            <View>
              <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
              <Text style={styles.unit}>per {product.unit}</Text>
            </View>
            {product.mrp && product.mrp > product.price && (
              <View style={styles.mrpContainer}>
                <Text style={styles.mrpLabel}>MRP:</Text>
                <Text style={styles.mrp}>₹{product.mrp.toFixed(2)}</Text>
                <Text style={styles.discount}>
                  {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.sectionText}>{product.description}</Text>
            </View>
          )}

          {/* Product Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            
            {product.packet_size && (
              <View style={styles.detailRow}>
                <Ionicons name="resize-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Packet Size:</Text>
                <Text style={styles.detailValue}>{product.packet_size}</Text>
              </View>
            )}

            {product.shelf_life && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Shelf Life:</Text>
                <Text style={styles.detailValue}>{product.shelf_life}</Text>
              </View>
            )}

            {product.storage_instructions && (
              <View style={styles.detailRow}>
                <Ionicons name="snow-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Storage:</Text>
                <Text style={styles.detailValue}>{product.storage_instructions}</Text>
              </View>
            )}
          </View>

          {/* Remarks */}
          {product.remarks && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              <Text style={styles.sectionText}>{product.remarks}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Add to Cart Section */}
      <View style={styles.bottomContainer}>
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <TouchableOpacity style={styles.quantityButton} onPress={decreaseQuantity}>
            <Ionicons name="remove" size={20} color="#8B4513" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity style={styles.quantityButton} onPress={increaseQuantity}>
            <Ionicons name="add" size={20} color="#8B4513" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Ionicons name="cart" size={24} color="#fff" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  placeholderImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  fssaiBadge: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
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
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  vegDot: {
    backgroundColor: '#00A651',
  },
  nonVegDot: {
    backgroundColor: '#8B4513',
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  unit: {
    fontSize: 14,
    color: '#666',
  },
  mrpContainer: {
    alignItems: 'flex-end',
  },
  mrpLabel: {
    fontSize: 12,
    color: '#999',
  },
  mrp: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discount: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
    color: '#333',
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
    marginHorizontal: 15,
    minWidth: 30,
    textAlign: 'center',
    color: '#333',
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
