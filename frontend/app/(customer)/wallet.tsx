import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useAuthStore } from '../../store';

export default function WalletScreen() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [addingMoney, setAddingMoney] = useState(false);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const data = await apiService.getWallet();
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      Alert.alert('Error', 'Failed to load wallet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
    refreshUser();
  };

  const handleAddMoney = async () => {
    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setAddingMoney(true);
    try {
      // Mock payment - in real app, this would open Razorpay
      Alert.alert(
        'Add Money to Wallet',
        `Add ₹${amountNum.toFixed(2)} to your wallet?\n\nNote: Payment integration will be added when Razorpay credentials are provided.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setAddingMoney(false) },
          {
            text: 'Simulate Success',
            onPress: async () => {
              try {
                // In real app: Create Razorpay order, open checkout, verify payment
                // For now, we'll just show success
                Alert.alert('Success', 'Money added to wallet successfully!\n(Mocked transaction)');
                setAmount('');
                await fetchWallet();
                await refreshUser();
              } catch (error) {
                Alert.alert('Error', 'Failed to add money');
              } finally {
                setAddingMoney(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate payment');
      setAddingMoney(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceIcon}>
          <Ionicons name="wallet" size={50} color="#8B4513" />
        </View>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>₹{wallet?.balance?.toFixed(2) || '0.00'}</Text>
        <Text style={styles.balanceDate}>
          Last updated: {new Date(wallet?.updated_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.addMoneySection}>
        {user?.can_topup_wallet !== false && (
          <>
            <Text style={styles.sectionTitle}>Add Money to Wallet</Text>
            <View style={styles.addMoneyCard}>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Enter amount"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  editable={!addingMoney}
                />
              </View>

              <View style={styles.quickAmounts}>
                {[100, 500, 1000, 2000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.quickAmountButton}
                    onPress={() => setAmount(amt.toString())}
                    disabled={addingMoney}
                  >
                    <Text style={styles.quickAmountText}>₹{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.addButton, addingMoney && styles.addButtonDisabled]}
                onPress={handleAddMoney}
                disabled={addingMoney}
          >
            {addingMoney ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.addButtonText}>Add Money via UPI</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.paymentNote}>
            Note: UPI payment integration (Razorpay) will be activated when credentials are provided.
          </Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={24} color="#8B4513" />
            <Text style={styles.infoText}>Add money to your wallet using UPI</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={24} color="#8B4513" />
            <Text style={styles.infoText}>Use wallet balance for quick checkout</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={24} color="#8B4513" />
            <Text style={styles.infoText}>Track all transactions in one place</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={24} color="#8B4513" />
            <Text style={styles.infoText}>Secure and instant payments</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  scrollContent: {
    paddingBottom: 100,
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  balanceIcon: {
    marginBottom: 15,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
  },
  balanceDate: {
    fontSize: 12,
    color: '#999',
  },
  addMoneySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  addMoneyCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B4513',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    height: 50,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#FFF8DC',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  quickAmountText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#8B4513',
  },
  addButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  addButtonDisabled: {
    backgroundColor: '#999',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  paymentNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 14,
    color: '#666',
  },
});
