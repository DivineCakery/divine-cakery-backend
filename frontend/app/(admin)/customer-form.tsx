import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

export default function CustomerFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.id as string;
  const isEdit = !!userId;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    business_name: '',
    address: '',
    can_topup_wallet: true,
    onsite_pickup_only: false,
    role: 'customer',
    admin_access_level: 'full',
  });

  useEffect(() => {
    if (isEdit) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const users = await apiService.getAllUsers();
      const user = users.find((u: any) => u.id === userId);
      if (user) {
        setFormData({
          username: user.username,
          password: '', // Don't show existing password
          email: user.email || '',
          phone: user.phone || '',
          business_name: user.business_name || '',
          address: user.address || '',
          can_topup_wallet: user.can_topup_wallet !== false,
          role: user.role || 'customer',
          admin_access_level: user.admin_access_level || 'full',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load user');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.username) {
      Alert.alert('Validation Error', 'Username is required');
      return;
    }

    if (!isEdit && !formData.password) {
      Alert.alert('Validation Error', 'Password is required for new customers');
      return;
    }

    if (!isEdit && formData.password.length < 4) {
      Alert.alert('Validation Error', 'Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      const customerData: any = {
        username: formData.username,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        business_name: formData.business_name || undefined,
        address: formData.address || undefined,
        role: formData.role,
        admin_access_level: formData.admin_access_level,
      };

      // Only include can_topup_wallet for customers
      if (formData.role === 'customer') {
        customerData.can_topup_wallet = formData.can_topup_wallet;
      }

      if (isEdit) {
        // Only include password if it's being changed
        if (formData.password) {
          customerData.password = formData.password;
        }
        await apiService.updateUserByAdmin(userId, customerData);
        Alert.alert('Success', 'User updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        customerData.password = formData.password;
        await apiService.createUserByAdmin(customerData);
        Alert.alert('Success', 'User created successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit User' : 'Add User'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            value={formData.username}
            onChangeText={(text) => setFormData({ ...formData, username: text })}
            autoCapitalize="none"
            editable={!loading && !isEdit}
          />
          {isEdit && <Text style={styles.hint}>Username cannot be changed</Text>}

          <Text style={styles.label}>{isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}</Text>
          <TextInput
            style={styles.input}
            placeholder={isEdit ? 'Leave blank to keep current password' : 'Enter password'}
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="customer@example.com"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.label}>Business Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Restaurant/Cafe/Hotel name"
            value={formData.business_name}
            onChangeText={(text) => setFormData({ ...formData, business_name: text })}
            editable={!loading}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Delivery address"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            multiline
            numberOfLines={3}
            editable={!loading}
          />

          <Text style={styles.label}>User Role</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleOption, formData.role === 'customer' && styles.roleOptionActive]}
              onPress={() => setFormData({ ...formData, role: 'customer' })}
              disabled={loading}
            >
              <Ionicons 
                name="person" 
                size={20} 
                color={formData.role === 'customer' ? '#fff' : '#8B4513'} 
              />
              <Text style={[styles.roleText, formData.role === 'customer' && styles.roleTextActive]}>
                Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, formData.role === 'admin' && styles.roleOptionActive]}
              onPress={() => setFormData({ ...formData, role: 'admin' })}
              disabled={loading}
            >
              <Ionicons 
                name="shield-checkmark" 
                size={20} 
                color={formData.role === 'admin' ? '#fff' : '#8B4513'} 
              />
              <Text style={[styles.roleText, formData.role === 'admin' && styles.roleTextActive]}>
                Admin
              </Text>
            </TouchableOpacity>
          </View>

          {formData.role === 'admin' && (
            <>
              <Text style={styles.label}>Admin Access Level</Text>
              <View style={styles.accessLevelContainer}>
                <TouchableOpacity
                  style={[styles.accessOption, formData.admin_access_level === 'full' && styles.accessOptionActive]}
                  onPress={() => setFormData({ ...formData, admin_access_level: 'full' })}
                  disabled={loading}
                >
                  <Ionicons 
                    name="shield-checkmark" 
                    size={18} 
                    color={formData.admin_access_level === 'full' ? '#fff' : '#8B4513'} 
                  />
                  <Text style={[styles.accessText, formData.admin_access_level === 'full' && styles.accessTextActive]}>
                    Full Access
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.accessOption, formData.admin_access_level === 'limited' && styles.accessOptionActive]}
                  onPress={() => setFormData({ ...formData, admin_access_level: 'limited' })}
                  disabled={loading}
                >
                  <Ionicons 
                    name="shield-half" 
                    size={18} 
                    color={formData.admin_access_level === 'limited' ? '#fff' : '#8B4513'} 
                  />
                  <Text style={[styles.accessText, formData.admin_access_level === 'limited' && styles.accessTextActive]}>
                    Limited Access
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.accessOption, formData.admin_access_level === 'reports' && styles.accessOptionActive]}
                  onPress={() => setFormData({ ...formData, admin_access_level: 'reports' })}
                  disabled={loading}
                >
                  <Ionicons 
                    name="stats-chart" 
                    size={18} 
                    color={formData.admin_access_level === 'reports' ? '#fff' : '#8B4513'} 
                  />
                  <Text style={[styles.accessText, formData.admin_access_level === 'reports' && styles.accessTextActive]}>
                    Reports Only
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>
                {formData.admin_access_level === 'full' && 'Full access to all admin features'}
                {formData.admin_access_level === 'limited' && 'Can manage orders but not users or products'}
                {formData.admin_access_level === 'reports' && 'Can only view reports and revenue data'}
              </Text>
            </>
          )}

          {formData.role === 'customer' && (
            <>
              <View style={styles.toggleContainer}>
                <View style={styles.toggleLabel}>
                  <Ionicons name="wallet" size={20} color="#8B4513" />
                  <Text style={styles.label}>Allow Wallet Top-up</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleButton, formData.can_topup_wallet && styles.toggleButtonActive]}
                  onPress={() => setFormData({ ...formData, can_topup_wallet: !formData.can_topup_wallet })}
                  disabled={loading}
                >
                  <View style={[styles.toggleCircle, formData.can_topup_wallet && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>
                {formData.can_topup_wallet ? 'Customer can add money to wallet' : 'Customer cannot add money to wallet'}
              </Text>

              <View style={styles.toggleContainer}>
                <View style={styles.toggleLabel}>
                  <Ionicons name="location" size={20} color="#8B4513" />
                  <Text style={styles.label}>Onsite Pick-up Only</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleButton, formData.onsite_pickup_only && styles.toggleButtonActive]}
                  onPress={() => setFormData({ ...formData, onsite_pickup_only: !formData.onsite_pickup_only })}
                  disabled={loading}
                >
                  <View style={[styles.toggleCircle, formData.onsite_pickup_only && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>
                {formData.onsite_pickup_only ? 'Customer can only pick up orders onsite (no delivery option)' : 'Customer can choose pickup or delivery'}
              </Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {isEdit ? 'Update User' : 'Create User'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 15,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8B4513',
    backgroundColor: '#fff',
  },
  roleOptionActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  roleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  roleTextActive: {
    color: '#fff',
  },
  accessLevelContainer: {
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  accessOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
    backgroundColor: '#fff',
  },
  accessOptionActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  accessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
  accessTextActive: {
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    width: 60,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ccc',
    padding: 3,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleCircleActive: {
    transform: [{ translateX: 28 }],
  },
  submitButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    marginTop: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
