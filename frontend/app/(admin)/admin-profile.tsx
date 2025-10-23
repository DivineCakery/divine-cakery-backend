import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';

export default function AdminProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 100}}>
      <View style={styles.header}>
        <Text style={styles.userName}>{user?.username}</Text>
        <Text style={styles.userRole}>Administrator</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#8B4513" />
            <Text style={styles.infoLabel}>Username:</Text>
            <Text style={styles.infoValue}>{user?.username}</Text>
          </View>
          {user?.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#8B4513" />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <MaterialCommunityIcons name="cupcake" size={40} color="#8B4513" />
        <Text style={styles.footerTitle}>Divine Cakery</Text>
        <Text style={styles.footerText}>Admin Panel v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8DC' },
  header: { backgroundColor: '#8B4513', paddingTop: 50, paddingBottom: 30, alignItems: 'center' },
  logoImage: { width: 80, height: 80, marginBottom: 15 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#A0522D', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  userRole: { fontSize: 16, color: '#FFF8DC', marginTop: 5 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  infoCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { marginLeft: 15, fontSize: 14, color: '#999', width: 80 },
  infoValue: { flex: 1, fontSize: 16, color: '#333', fontWeight: '600' },
  logoutButton: { backgroundColor: '#ff3b30', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 10 },
  logoutButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  footer: { alignItems: 'center', paddingVertical: 30 },
  footerTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B4513', marginTop: 10 },
  footerText: { fontSize: 12, color: '#999', marginTop: 5 },
});
