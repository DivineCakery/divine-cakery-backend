import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
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
        <MaterialCommunityIcons name="cupcake" size={40} color="#fff" />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Divine Cakery</Text>
          <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
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

        <View style={[styles.revenueCard, { backgroundColor: '#8B4513' }]}>
          <Ionicons name="cash" size={50} color="#fff" />
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueAmount}>
            ₹{stats?.total_revenue?.toFixed(2) || '0.00'}
          </Text>
          <Text style={styles.revenueSubtext}>From all completed orders</Text>
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
  headerText: {
    marginLeft: 15,
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
  quickActions: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
});
