import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { showAlert } from \'../../utils/alerts\';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../../services/api';
import { DIVINE_WHATSAPP_NUMBER } from '../../constants/whatsapp';

export default function PendingApprovalsScreen() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchPendingUsers();
    }, [])
  );

  const fetchPendingUsers = async () => {
    try {
      const data = await apiService.getPendingUsers();
      setPendingUsers(data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      showAlert('Error', 'Failed to load pending users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingUsers();
  };

  const handleApprove = async (user: any) => {
    showAlert(
      'Approve Customer',
      `Approve ${user.username}? They will receive a WhatsApp confirmation.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              const result = await apiService.approveUser(user.id);
              
              // Send WhatsApp notification
              if (result.phone) {
                const phoneNumber = result.phone.replace(/\D/g, '');
                const message = `🎉 Great news! Your Divine Cakery account has been approved! You can now login and start ordering. Welcome to our family! - Divine Cakery`;
                const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
                
                try {
                  const canOpen = await Linking.canOpenURL(whatsappUrl);
                  if (canOpen) {
                    await Linking.openURL(whatsappUrl);
                  } else {
                    const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                    await Linking.openURL(webUrl);
                  }
                } catch (error) {
                  console.log('WhatsApp notification error:', error);
                }
              }
              
              await fetchPendingUsers();
              showAlert('Success', 'Customer approved successfully');
            } catch (error) {
              console.error('Error approving user:', error);
              showAlert('Error', 'Failed to approve customer');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (user: any) => {
    showAlert(
      'Reject Customer',
      `Reject ${user.username}? Their account will be deleted and they will receive a WhatsApp message to contact us.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await apiService.rejectUser(user.id);
              
              // Send WhatsApp notification
              if (result.phone) {
                const phoneNumber = result.phone.replace(/\D/g, '');
                const message = `Hello! Your Divine Cakery registration requires additional verification. Please call us at ${DIVINE_WHATSAPP_NUMBER} for account approval. Thank you! - Divine Cakery`;
                const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
                
                try {
                  const canOpen = await Linking.canOpenURL(whatsappUrl);
                  if (canOpen) {
                    await Linking.openURL(whatsappUrl);
                  } else {
                    const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                    await Linking.openURL(webUrl);
                  }
                } catch (error) {
                  console.log('WhatsApp notification error:', error);
                }
              }
              
              await fetchPendingUsers();
              showAlert('Success', 'Customer rejected successfully');
            } catch (error) {
              console.error('Error rejecting user:', error);
              showAlert('Error', 'Failed to reject customer');
            }
          },
        },
      ]
    );
  };

  const renderPendingUser = ({ item }: any) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <Ionicons name="person-circle" size={50} color="#8B4513" />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.businessName}>{item.business_name || 'No business name'}</Text>
        </View>
      </View>

      <View style={styles.userDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color="#666" />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>
        {item.email && (
          <View style={styles.detailRow}>
            <Ionicons name="mail" size={16} color="#666" />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
        )}
        {item.address && (
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.detailText}>{item.address}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.detailText}>
            Registered: {new Date(item.created_at).toLocaleDateString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item)}
        >
          <Ionicons name="close-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(item)}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Approve</Text>
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
        <Text style={styles.headerTitle}>Pending Approvals</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingUsers.length}</Text>
        </View>
      </View>

      <FlatList
        data={pendingUsers}
        renderItem={renderPendingUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle" size={80} color="#4CAF50" />
            <Text style={styles.emptyText}>No pending approvals</Text>
            <Text style={styles.emptySubtext}>All customers have been reviewed</Text>
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
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    backgroundColor: '#FF5722',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 30,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  businessName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userDetails: {
    gap: 8,
    marginBottom: 15,
    paddingLeft: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
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
  },
});
