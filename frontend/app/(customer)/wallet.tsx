import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import apiService from '../../services/api';
import { useAuthStore } from '../../store';
import { DIVINE_WHATSAPP_NUMBER } from '../../constants/whatsapp';

export default function WalletScreen() {
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [addingMoney, setAddingMoney] = useState(false);
  const { user, refreshUser, logout } = useAuthStore();
  
  // Payment pending state
  const [showPaymentPending, setShowPaymentPending] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);

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

  useEffect(() => {
    fetchWallet();
  }, []);

  // Refresh user permissions in real-time when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      refreshUser();
    }, [])
  );

  const fetchWallet = async () => {
    try {
      const data = await apiService.getWallet();
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      showAlert('Error', 'Failed to load wallet');
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
      showAlert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setAddingMoney(true);

    try {
      const paymentData = await apiService.createPaymentOrder(amountNum);
      
      if (!paymentData.payment_link_url) {
        throw new Error('Failed to create payment link');
      }
      
      // Open payment link in device's default browser (stays open during app switches)
      await Linking.openURL(paymentData.payment_link_url);
      
      // Show the "Payment Pending" modal
      setAddingMoney(false);
      setAmount('');
      setShowPaymentPending(true);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      showAlert('Error', error.response?.data?.detail || 'Failed to initiate payment');
      setAddingMoney(false);
    }
  };

  const handleCheckBalance = async () => {
    setCheckingBalance(true);
    try {
      await fetchWallet();
      await refreshUser();
      // Small delay for callback processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchWallet();
      await refreshUser();
      setCheckingBalance(false);
      setShowPaymentPending(false);
      showAlert('Balance Refreshed', 'Your wallet balance has been updated. If payment was completed, the new balance should reflect now.');
    } catch (error) {
      setCheckingBalance(false);
      showAlert('Error', 'Failed to refresh balance. Please try again.');
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
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceIcon}>
          <Ionicons name="wallet" size={40} color="#8B4513" />
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
                Secure payments powered by Razorpay. Pay using UPI, Cards, or Net Banking.
              </Text>
            </View>
          </>
        )}
        
        {user?.can_topup_wallet === false && (
          <View style={styles.restrictedCard}>
            <Ionicons name="lock-closed" size={40} color="#666" />
            <Text style={styles.restrictedTitle}>Wallet Top-up Restricted</Text>
            <Text style={styles.restrictedText}>
              {user?.user_type === 'order_agent' 
                ? 'Order Agents cannot add money to wallet. The linked owner account manages wallet balance.'
                : 'Your account does not have access to wallet top-up facility. Please contact Divine Cakery admin for assistance.'}
            </Text>
          </View>
        )}
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

      {/* Payment Pending Modal */}
      <Modal visible={showPaymentPending} animationType="slide" transparent onRequestClose={() => {}}>
        <View style={styles.paymentPendingOverlay}>
          <View style={styles.paymentPendingContent}>
            <View style={styles.paymentPendingIcon}>
              <Ionicons name="card-outline" size={48} color="#8B4513" />
            </View>
            <Text style={styles.paymentPendingTitle}>Complete Your Payment</Text>
            <Text style={styles.paymentPendingText}>
              The payment page is open in your browser.{'\n\n'}
              1. Switch to your browser to complete payment{'\n'}
              2. Enter OTP if required{'\n'}
              3. Come back here and tap the button below
            </Text>
            
            <TouchableOpacity
              style={[styles.checkBalanceButton, checkingBalance && styles.checkBalanceButtonDisabled]}
              onPress={handleCheckBalance}
              disabled={checkingBalance}
            >
              {checkingBalance ? (
                <View style={styles.checkingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.checkBalanceButtonText}>  Checking balance...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.checkBalanceButtonText}>  I've Completed Payment</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelPendingButton} onPress={() => setShowPaymentPending(false)} disabled={checkingBalance}>
              <Text style={styles.cancelPendingButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    padding: 8,
    paddingTop: 35,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  balanceIcon: {
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  balanceDate: {
    fontSize: 11,
    color: '#999',
  },
  addMoneySection: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  addMoneyCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  restrictedCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  restrictedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
  // Payment Pending Modal styles
  paymentPendingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentPendingContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  paymentPendingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentPendingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  paymentPendingText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'left',
  },
  checkBalanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 12,
  },
  checkBalanceButtonDisabled: {
    backgroundColor: '#999',
  },
  checkBalanceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelPendingButton: {
    padding: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelPendingButtonText: {
    color: '#999',
    fontSize: 14,
  },
});
