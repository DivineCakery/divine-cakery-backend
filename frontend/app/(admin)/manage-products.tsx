import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

export default function ManageProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<string>('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await apiService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const toggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      await apiService.updateProduct(productId, { is_available: !currentStatus });
      await fetchProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to update product');
    }
  };

  const updateClosingStock = async (productId: string, newStock: number) => {
    try {
      await apiService.updateProduct(productId, { closing_stock: newStock });
      await fetchProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to update closing stock');
    }
  };

  const handleDelete = async (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteProduct(productId);
              await fetchProducts();
              Alert.alert('Success', 'Product deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }: any) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <MaterialCommunityIcons name="bread-slice" size={40} color="#8B4513" />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>MRP:</Text>
          <Text style={styles.mrpPrice}>₹{item.mrp?.toFixed(2) || '0.00'}</Text>
        </View>
        <View>
          <Text style={styles.priceLabel}>Price:</Text>
          <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
        </View>
        {item.packet_size && (
          <View>
            <Text style={styles.priceLabel}>Size:</Text>
            <Text style={styles.packetSize}>{item.packet_size}</Text>
          </View>
        )}
      </View>

      {item.description && (
        <Text style={styles.productDescription}>{item.description}</Text>
      )}

      {item.remarks && (
        <View style={styles.remarksContainer}>
          <Text style={styles.remarksLabel}>Remarks:</Text>
          <Text style={styles.remarksText}>{item.remarks}</Text>
        </View>
      )}

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
            <TextInput
              style={styles.stockInput}
              value={tempStockValue}
              onChangeText={setTempStockValue}
              keyboardType="numeric"
              autoFocus
              onBlur={() => {
                const newStock = parseInt(tempStockValue) || 0;
                if (newStock >= 0) {
                  updateClosingStock(item.id, newStock);
                }
                setEditingStockId(null);
                setTempStockValue('');
              }}
              onSubmitEditing={() => {
                const newStock = parseInt(tempStockValue) || 0;
                if (newStock >= 0) {
                  updateClosingStock(item.id, newStock);
                }
                setEditingStockId(null);
                setTempStockValue('');
              }}
            />
          ) : (
            <TouchableOpacity
              onPress={() => {
                setEditingStockId(item.id);
                setTempStockValue(String(item.closing_stock || 0));
              }}
            >
              <Text style={styles.stockValue}>{item.closing_stock || 0} {item.unit || 'units'}</Text>
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

      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/(admin)/product-form?id=${item.id}`)}
        >
          <Ionicons name="create" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.availabilityButton,
            item.is_available ? styles.availableButton : styles.unavailableButton,
          ]}
          onPress={() => toggleAvailability(item.id, item.is_available)}
        >
          <Text style={styles.availabilityText}>
            {item.is_available ? 'Available' : 'Unavailable'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
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
        <Text style={styles.headerTitle}>Manage Products</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(admin)/product-form')}
        >
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
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
  header: { backgroundColor: '#8B4513', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  addButton: { padding: 5 },
  listContainer: { padding: 15, paddingBottom: 100 },
  productCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  productHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
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
  stockContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 10 },
  stockLabel: { fontSize: 14, fontWeight: '600', color: '#2e7d32' },
  stockInputContainer: { flexDirection: 'row', alignItems: 'center' },
  stockButton: { backgroundColor: '#fff', padding: 8, borderRadius: 6, marginHorizontal: 5, elevation: 1 },
  stockValue: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', minWidth: 80, textAlign: 'center' },
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
  productActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editButton: { flexDirection: 'row', backgroundColor: '#2196F3', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  editButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
  availabilityButton: { flex: 1, padding: 8, borderRadius: 8, marginHorizontal: 8 },
  availableButton: { backgroundColor: '#4CAF50' },
  unavailableButton: { backgroundColor: '#f44336' },
  availabilityText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  deleteButton: { backgroundColor: '#ff3b30', padding: 10, borderRadius: 8, width: 45, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 10 },
});
