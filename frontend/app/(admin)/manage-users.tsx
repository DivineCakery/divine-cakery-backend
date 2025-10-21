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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

export default function ManageUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiService.getAllUsers();
      setUsers(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleDelete = async (userId: string, username: string) => {
    Alert.alert(
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
              Alert.alert('Success', 'Customer deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }: any) => {
    const isAdmin = item.role === 'admin';
    const accessLevelLabel = item.admin_access_level === 'full' ? 'Full Access' 
      : item.admin_access_level === 'limited' ? 'Limited Access' 
      : item.admin_access_level === 'reports_only' ? 'Reports Only' 
      : '';
    
    return (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
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

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/(admin)/customer-form?id=${item.id}`)}
        >
          <Ionicons name="create" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.username)}
        >
          <Ionicons name="trash" size={18} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(admin)/customer-form')}
        >
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSubtitle}>{users.length} Users Total</Text>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
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
});
