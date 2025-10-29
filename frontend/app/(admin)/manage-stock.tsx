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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<string>('');

  useFocusEffect(
    React.useCallback(() => {
      fetchProducts();
    }, [])
  );

  const fetchProducts = async () => {
    try {
      const data = await apiService.getProducts();
      setProducts(data);
    } catch (error) {
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

  const updateClosingStock = async (productId: string, newStock: number) => {
    try {
      await apiService.updateProduct(productId, { closing_stock: newStock });
      await fetchProducts();
      Alert.alert('Success', 'Stock updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update closing stock');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: () => {
            logout();
            router.replace('/login' as any);
          },
          style: 'destructive'
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
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No products available</Text>
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
