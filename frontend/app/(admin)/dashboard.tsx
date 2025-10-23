import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { DIVINE_LOGO } from '../../constants/logo';
import { useAuthStore } from '../../store';

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const { logout, user } = useAuthStore();

  const accessLevel = user?.admin_access_level || 'full';

  const handleLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to logout from admin panel?',
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

  useEffect(() => {
    fetchStats();
    fetchDailyRevenue();
    fetchPendingApprovals();
  }, []);

  // Refresh stats and pending approvals when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchStats();
      fetchPendingApprovals();
    }, [])
  );

  const fetchStats = async () => {
    try {
      const data = await apiService.getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDailyRevenue = async () => {
    try {
      const data = await apiService.getDailyRevenue();
      setDailyRevenue(data.daily_revenue || []);
    } catch (error) {
      console.error('Error fetching daily revenue:', error);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const data = await apiService.getPendingUsers();
      setPendingApprovalsCount(data.length);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      setPendingApprovalsCount(0);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchDailyRevenue();
    fetchPendingApprovals();
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
        <Image source={{ uri: DIVINE_LOGO }} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Divine Cakery Management</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        {(accessLevel === 'full' || accessLevel === 'limited') && (
          <>
            <View style={styles.statsRow}>
              <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: '#4CAF50' }]}
                onPress={() => router.push('/(admin)/manage-users')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="account-group" size={40} color="#fff" />
                <Text style={styles.statNumber}>{stats?.total_users || 0}</Text>
                <Text style={styles.statLabel}>Total Customers</Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#fff" style={styles.arrowIcon} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: '#2196F3' }]}
                onPress={() => router.push('/(admin)/manage-products')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="bread-slice" size={40} color="#fff" />
                <Text style={styles.statNumber}>{stats?.total_products || 0}</Text>
                <Text style={styles.statLabel}>Products</Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#fff" style={styles.arrowIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: '#FF9800' }]}
                onPress={() => router.push('/(admin)/manage-orders')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="clipboard-text" size={40} color="#fff" />
                <Text style={styles.statNumber}>{stats?.total_orders || 0}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#fff" style={styles.arrowIcon} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: '#f44336' }]}
                onPress={() => router.push('/(admin)/manage-orders')}
                activeOpacity={0.7}
              >
                <Ionicons name="time" size={40} color="#fff" />
                <Text style={styles.statNumber}>{stats?.pending_orders || 0}</Text>
                <Text style={styles.statLabel}>Pending Orders</Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#fff" style={styles.arrowIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.revenueBreakdown}>
              <Text style={styles.breakdownTitle}>Revenue Breakdown</Text>
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <Ionicons name="today" size={24} color="#4CAF50" />
                    <Text style={styles.breakdownLabel}>Today</Text>
                    <Text style={styles.breakdownValue}>₹{stats?.today_revenue?.toFixed(2) || '0.00'}</Text>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.breakdownItem}>
                    <Ionicons name="calendar" size={24} color="#2196F3" />
                    <Text style={styles.breakdownLabel}>This Week</Text>
                    <Text style={styles.breakdownValue}>₹{stats?.week_revenue?.toFixed(2) || '0.00'}</Text>
                  </View>
                </View>
                <View style={styles.breakdownDivider2} />
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <Ionicons name="calendar-outline" size={24} color="#FF9800" />
                    <Text style={styles.breakdownLabel}>This Month</Text>
                    <Text style={styles.breakdownValue}>₹{stats?.month_revenue?.toFixed(2) || '0.00'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.dailyRevenueSection}>
              <Text style={styles.dailyRevenueTitle}>Last 7 Days Revenue</Text>
              {dailyRevenue.map((day, index) => (
                <View key={index} style={styles.dailyRevenueCard}>
                  <View style={styles.dailyRevenueLeft}>
                    <Text style={styles.dailyRevenueDay}>{day.day_name}</Text>
                    <Text style={styles.dailyRevenueDate}>
                      {new Date(day.date).toLocaleDateString('en-IN', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                  <View style={styles.dailyRevenueRight}>
                    <Text style={styles.dailyRevenueAmount}>₹{day.revenue.toFixed(2)}</Text>
                    <Text style={styles.dailyRevenueOrders}>
                      {day.order_count} order{day.order_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>
            {accessLevel === 'reports' ? 'Reports' : accessLevel === 'limited' ? 'Reports' : 'Settings & Reports'}
          </Text>
          
          {(accessLevel === 'full' || accessLevel === 'limited' || accessLevel === 'reports') && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/(admin)/reports' as any)}
            >
              <Ionicons name="bar-chart-outline" size={24} color="#8B4513" />
              <View style={styles.settingsButtonText}>
                <Text style={styles.settingsButtonTitle}>Daily Items Report</Text>
                <Text style={styles.settingsButtonSubtitle}>View item-wise orders and revenue</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          )}

          {accessLevel === 'full' && (
            <>
              <TouchableOpacity
                style={[styles.settingsButton, { marginTop: 10 }]}
                onPress={() => router.push('/(admin)/pending-approvals' as any)}
              >
                <View style={styles.iconWithBadge}>
                  <Ionicons name="person-add" size={24} color="#FF5722" />
                  {pendingApprovalsCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingApprovalsCount}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.settingsButtonText}>
                  <Text style={styles.settingsButtonTitle}>Pending Approvals</Text>
                  <Text style={styles.settingsButtonSubtitle}>Approve or reject new customer registrations</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsButton, { marginTop: 10 }]}
                onPress={() => router.push('/(admin)/manage-categories' as any)}
              >
                <Ionicons name="albums-outline" size={24} color="#8B4513" />
                <View style={styles.settingsButtonText}>
                  <Text style={styles.settingsButtonTitle}>Manage Categories</Text>
                  <Text style={styles.settingsButtonSubtitle}>Add and organize product categories</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsButton, { marginTop: 10 }]}
                onPress={() => router.push('/(admin)/manage-discounts' as any)}
              >
                <Ionicons name="pricetag-outline" size={24} color="#8B4513" />
                <View style={styles.settingsButtonText}>
                  <Text style={styles.settingsButtonTitle}>Manage Discounts</Text>
                  <Text style={styles.settingsButtonSubtitle}>Create and manage customer discounts</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsButton, { marginTop: 10 }]}
                onPress={() => router.push('/(admin)/delivery-settings' as any)}
              >
                <Ionicons name="bicycle-outline" size={24} color="#8B4513" />
                <View style={styles.settingsButtonText}>
                  <Text style={styles.settingsButtonTitle}>Delivery Settings</Text>
                  <Text style={styles.settingsButtonSubtitle}>Configure delivery charges</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsButton, { marginTop: 10 }]}
                onPress={() => router.push('/(admin)/delivery-notes' as any)}
              >
                <Ionicons name="notifications-outline" size={24} color="#8B4513" />
                <View style={styles.settingsButtonText}>
                  <Text style={styles.settingsButtonTitle}>Delivery Notes</Text>
                  <Text style={styles.settingsButtonSubtitle}>Manage customer delivery notifications</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
            </>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 50,
    marginRight: 10,
  },
  headerText: {
    marginLeft: 5,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFF8DC',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statsContainer: {
    padding: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: 'relative',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  arrowIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.7,
  },
  revenueCard: {
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  revenueLabel: {
    fontSize: 16,
    color: '#FFF8DC',
    marginTop: 15,
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  revenueSubtext: {
    fontSize: 12,
    color: '#FFF8DC',
    marginTop: 5,
    opacity: 0.8,
  },
  revenueBreakdown: {
    marginTop: 15,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 5,
  },
  breakdownDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
  },
  breakdownDivider2: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
  dailyRevenueSection: {
    marginTop: 15,
  },
  dailyRevenueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
  },
  dailyRevenueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  dailyRevenueLeft: {
    flex: 1,
  },
  dailyRevenueDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dailyRevenueDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dailyRevenueRight: {
    alignItems: 'flex-end',
  },
  dailyRevenueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  dailyRevenueOrders: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  settingsSection: {
    marginTop: 15,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  settingsButtonText: {
    flex: 1,
    marginLeft: 12,
  },
  settingsButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButtonSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  iconWithBadge: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
