import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={60} color="#8B4513" />
        </View>
        <Text style={styles.userName}>{user?.username}</Text>
        {user?.business_name && (
          <Text style={styles.businessName}>{user.business_name}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="person-outline" size={20} color="#8B4513" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{user?.username}</Text>
            </View>
          </View>

          {user?.email && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="mail-outline" size={20} color="#8B4513" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            </View>
          )}

          {user?.phone && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="call-outline" size={20} color="#8B4513" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            </View>
          )}

          {user?.address && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="location-outline" size={20} color="#8B4513" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{user.address}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="wallet-outline" size={20} color="#8B4513" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Wallet Balance</Text>
              <Text style={[styles.infoValue, styles.balanceText]}>
                ₹{user?.wallet_balance?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutCard}>
          <MaterialCommunityIcons name="cupcake" size={40} color="#8B4513" />
          <Text style={styles.aboutTitle}>Divine Cakery</Text>
          <Text style={styles.aboutText}>Wholesale Bakery Products</Text>
          <Text style={styles.aboutAddress}>
            BNRA 161, Bhagawathi Nagar{' \n'}
            NCC Road, Thiruvananthapuram{' \n'}
            Kerala, India
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Divine Cakery v1.0.0</Text>
        <Text style={styles.footerSubtext}>Powered by Emergent</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  header: {
    backgroundColor: '#8B4513',
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF8DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  businessName: {
    fontSize: 16,
    color: '#FFF8DC',
    marginTop: 5,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIconContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  balanceText: {
    fontWeight: 'bold',
    color: '#8B4513',
    fontSize: 18,
  },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  aboutAddress: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#ccc',
    marginTop: 2,
  },
});
