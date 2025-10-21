import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useCartStore, useAuthStore } from '../../store';

export default function CartScreen() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getTotalAmount, clearCart } = useCartStore();
  const { logout } = useAuthStore();
  const totalAmount = getTotalAmount();

  const handleLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      items.length > 0 
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

  // Calculate delivery date based on order time
  // Orders before 4 AM: same day delivery
  // Orders after 4 AM: next day delivery
  const getDeliveryDate = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    const deliveryDate = new Date(now);
    
    // If order is placed after 4 AM, add 1 day
    if (currentHour >= 4) {
      deliveryDate.setDate(now.getDate() + 1);
    }
    // If before 4 AM, delivery is same day (no change needed)
    
    return deliveryDate.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before checkout');
      return;
    }
    router.push('/(customer)/checkout' as any);
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order and clear the cart?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          onPress: () => {
            clearCart();
            Alert.alert('Order Cancelled', 'Your cart has been cleared');
          }, 
          style: 'destructive' 
        },
      ]
    );
  };

  const renderCartItem = ({ item }: any) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product_name}</Text>
        <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={20} color="#8B4513" />
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.product_id, item.quantity + 1)}
        >
          <Ionicons name="add" size={20} color="#8B4513" />
        </TouchableOpacity>
      </View>
      <View style={styles.itemFooter}>
        <Text style={styles.subtotal}>Subtotal: ₹{item.subtotal.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => {
            Alert.alert(
              'Remove Item',
              `Remove ${item.product_name} from cart?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', onPress: () => removeItem(item.product_id), style: 'destructive' },
              ]
            );
          }}
        >
          <Ionicons name="trash" size={20} color="#ff3b30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {items.length > 0 && (
        <View style={styles.clearCartContainer}>
          <TouchableOpacity onPress={() => {
            Alert.alert(
              'Clear Cart',
              'Remove all items from cart?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', onPress: clearCart, style: 'destructive' },
              ]
            );
          }}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={100} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/(customer)/products')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.product_id}
            contentContainerStyle={styles.listContainer}
          />

          <View style={styles.footer}>
            <View style={styles.deliveryDateContainer}>
              <Ionicons name="calendar" size={20} color="#8B4513" />
              <View style={styles.deliveryDateInfo}>
                <Text style={styles.deliveryDateLabel}>Expected Delivery:</Text>
                <Text style={styles.deliveryDateText}>{getDeliveryDate()}</Text>
              </View>
            </View>
            
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
                <Text style={styles.checkoutButtonText}>Place Order</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  header: {
    backgroundColor: '#8B4513',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  clearCartContainer: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  clearText: {
    color: '#FFF8DC',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 180,
  },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemInfo: {
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8DC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 40,
    textAlign: 'center',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  removeButton: {
    padding: 5,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 100,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  deliveryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  deliveryDateInfo: {
    marginLeft: 10,
    flex: 1,
  },
  deliveryDateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  deliveryDateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f44336',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  checkoutButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});
