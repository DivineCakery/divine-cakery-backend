import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

export default function ManageUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [showOrderAgentModal, setShowOrderAgentModal] = useState(false);
  const [agentFormData, setAgentFormData] = useState({ username: '', password: '', phone: '' });
  const [linkedAgents, setLinkedAgents] = useState<any>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiService.getAllUsers();
      
      // Sort users: Admin users first (locked at top), then newest customers first
      const sortedUsers = data.sort((a: any, b: any) => {
        // If one is admin and other is not, admin comes first
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        
        // If both are admins or both are customers, sort by created_at (newest first)
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      
      setUsers(sortedUsers);
    } catch (error) {
      showAlert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleAddBalance = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setBalanceAmount('');
    setShowAddBalanceModal(true);
  };

  const confirmAddBalance = async () => {
    const amountNum = parseFloat(balanceAmount || '0');
    if (amountNum <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    try {
      const result = await apiService.addWalletBalanceByAdmin(selectedUserId, amountNum);
      setShowAddBalanceModal(false);
      await fetchUsers();
      showAlert(
        'Success',
        `₹${amountNum.toFixed(2)} added to ${selectedUsername}'s wallet.\n\nNew Balance: ₹${result.new_balance.toFixed(2)}`
      );
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to add wallet balance');
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    showAlert(
      'Delete Customer',
      `Are you sure you want to delete "${username}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteUserByAdmin(userId);
              await fetchUsers();
              showAlert('Success', 'Customer deleted successfully');
            } catch (error: any) {
              showAlert('Error', error.response?.data?.detail || 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedUsers([]);
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const toggleSelectAll = () => {
    const customerUsers = users.filter((u: any) => u.role === 'customer');
    if (selectedUsers.length === customerUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(customerUsers.map((u: any) => u.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;

    showAlert(
      'Confirm Bulk Delete',
      `Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await apiService.bulkDeleteUsers(selectedUsers);
              showAlert(
                'Bulk Delete Complete',
                `${result.deleted_count} user(s) deleted${result.skipped_count > 0 ? `, ${result.skipped_count} skipped` : ''}${result.errors.length > 0 ? `\n\n${result.errors.join('\n')}` : ''}`
              );
              setSelectedUsers([]);
              setSelectionMode(false);
              fetchUsers();
            } catch (error: any) {
              showAlert('Error', error.response?.data?.detail || 'Failed to delete users');
            }
          },
        },
      ]
    );
  };

  const handleCreateOrderAgent = async () => {
    if (!agentFormData.username || !agentFormData.password || !agentFormData.phone) {
      showAlert('Error', 'Please fill all fields');
      return;
    }

    try {
      await apiService.createOrderAgent(selectedUserId, agentFormData);
      showAlert('Success', `Order Agent '${agentFormData.username}' created and linked to '${selectedUsername}'`);
      setShowOrderAgentModal(false);
      setAgentFormData({ username: '', password: '', phone: '' });
      fetchUsers();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to create order agent');
    }
  };

  const openOrderAgentModal = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setAgentFormData({ username: '', password: '', phone: '' });
    setShowOrderAgentModal(true);
  };

  const renderUser = ({ item }: any) => {
    const isAdmin = item.role === 'admin';
    const isOrderAgent = item.user_type === 'order_agent';
    const accessLevelLabel = item.admin_access_level === 'full' ? 'Full Access' 
      : item.admin_access_level === 'limited' ? 'Limited Access' 
      : item.admin_access_level === 'reports' ? 'Reports Only' 
      : '';
    const isSelected = selectedUsers.includes(item.id);
    const canSelect = !isAdmin && selectionMode;
    
    return (
    <TouchableOpacity 
      style={[styles.userCard, isSelected && styles.selectedCard]}
      onPress={() => canSelect && toggleUserSelection(item.id)}
      disabled={!selectionMode}
      activeOpacity={selectionMode ? 0.7 : 1}
      pointerEvents={selectionMode ? 'auto' : 'box-none'}
    >
      <View style={styles.userHeader}>
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            {!isAdmin ? (
              <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={28} 
                color={isSelected ? "#4CAF50" : "#999"} 
              />
            ) : (
              <View style={styles.checkboxPlaceholder} />
            )}
          </View>
        )}
        <View style={[styles.avatar, isAdmin && styles.adminAvatar]}>
          <Ionicons name={isAdmin ? "shield-checkmark" : "person"} size={30} color={isAdmin ? "#fff" : "#8B4513"} />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.username}</Text>
            {isAdmin && <Text style={styles.adminBadge}>ADMIN</Text>}
          </View>
          {item.business_name && (
            <Text style={styles.businessName}>{item.business_name}</Text>
          )}
          {isAdmin && accessLevelLabel && (
            <Text style={styles.accessLevel}>{accessLevelLabel}</Text>
          )}
        </View>
      </View>

      {item.email && <Text style={styles.infoText}>Email: {item.email}</Text>}
      {item.phone && <Text style={styles.infoText}>Phone: {item.phone}</Text>}
      {item.address && <Text style={styles.infoText}>Address: {item.address}</Text>}
      
      {!isAdmin && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Wallet</Text>
            <Text style={styles.statValue}>₹{item.wallet_balance?.toFixed(2)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Joined</Text>
            <Text style={styles.statValue}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionButtons} pointerEvents="box-none">
        {!isAdmin && (
          <TouchableOpacity
            style={styles.walletButton}
            onPress={() => {
              console.log('Add Balance clicked for:', item.username);
              handleAddBalance(item.id, item.username);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet" size={18} color="#fff" />
            <Text style={styles.walletButtonText}>Add Balance</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/(admin)/customer-form?id=${item.id}`)}
          activeOpacity={0.7}
        >
          <Ionicons name="create" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.username)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={18} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );};

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
        <Text style={styles.headerTitle}>Manage Users</Text>
        <View style={styles.headerButtons}>
          {!selectionMode ? (
            <>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={toggleSelectionMode}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/(admin)/customer-form')}
              >
                <Ionicons name="add-circle" size={28} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={toggleSelectionMode}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {selectionMode ? (
        <View style={styles.selectionHeader}>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={toggleSelectAll}
          >
            <Ionicons 
              name={selectedUsers.length === users.filter((u: any) => u.role === 'customer').length ? "checkbox" : "square-outline"} 
              size={24} 
              color="#8B4513" 
            />
            <Text style={styles.selectAllText}>Select All Customers</Text>
          </TouchableOpacity>
          <Text style={styles.selectedCount}>{selectedUsers.length} selected</Text>
        </View>
      ) : (
        <Text style={styles.headerSubtitle}>{users.length} Users Total</Text>
      )}

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          selectionMode && selectedUsers.length > 0 && { paddingBottom: 100 }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No users yet</Text>
          </View>
        }
      />
      
      {selectionMode && selectedUsers.length > 0 && (
        <View style={styles.bulkDeleteContainer}>
          <TouchableOpacity
            style={styles.bulkDeleteButton}
            onPress={handleBulkDelete}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.bulkDeleteText}>
              Delete Selected ({selectedUsers.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Balance Modal */}
      <Modal
        visible={showAddBalanceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddBalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Wallet Balance</Text>
            <Text style={styles.modalSubtitle}>
              Enter amount to add to {selectedUsername}'s wallet:
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={balanceAmount}
              onChangeText={setBalanceAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor="#999"
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  console.log('Cancel pressed');
                  setShowAddBalanceModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={() => {
                  console.log('Add Balance pressed, amount:', balanceAmount);
                  confirmAddBalance();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalAddText}>Add Balance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8DC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8DC' },
  header: { backgroundColor: '#8B4513', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#666', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  addButton: { padding: 5 },
  listContainer: { padding: 15, paddingBottom: 100 },
  userCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  userHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF8DC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  adminAvatar: { backgroundColor: '#8B4513' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  adminBadge: { backgroundColor: '#FF9800', color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  accessLevel: { fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' },
  businessName: { fontSize: 14, color: '#8B4513', marginTop: 2 },
  infoText: { fontSize: 14, color: '#666', marginBottom: 5 },
  statsRow: { flexDirection: 'row', marginTop: 10, marginBottom: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  statItem: { flex: 1 },
  statLabel: { fontSize: 12, color: '#999' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#8B4513', marginTop: 2 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  editButton: { flex: 1, flexDirection: 'row', backgroundColor: '#2196F3', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  editButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 14 },
  deleteButton: { flex: 1, flexDirection: 'row', backgroundColor: '#ff3b30', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 10 },
  checkboxContainer: { marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxPlaceholder: { width: 28, height: 28 },
  selectedCard: { borderColor: '#4CAF50', borderWidth: 2 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectButton: { backgroundColor: '#4CAF50', padding: 8, borderRadius: 20 },
  cancelButton: { backgroundColor: '#ff3b30', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  cancelButtonText: { color: '#fff', fontWeight: 'bold' },
  selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#f5f5f5' },
  selectAllButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAllText: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
  selectedCount: { fontSize: 14, color: '#666' },
  bulkDeleteContainer: { 
    position: 'absolute', 
    bottom: 130, 
    left: 20, 
    right: 20, 
    zIndex: 1000,
    elevation: 10,
  },
  bulkDeleteButton: { 
    backgroundColor: '#ff3b30', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 15, 
    paddingHorizontal: 20, 
    borderRadius: 25, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 3.84,
  },
  bulkDeleteText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 8,
  },
  walletButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  walletButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalAddText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
