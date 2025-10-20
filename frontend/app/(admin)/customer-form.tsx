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
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load customer');
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
      };

      if (isEdit) {
        // Only include password if it's being changed
        if (formData.password) {
          customerData.password = formData.password;
        }
        await apiService.updateUserByAdmin(userId, customerData);
        Alert.alert('Success', 'Customer updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        customerData.password = formData.password;
        await apiService.createUserByAdmin(customerData);
        Alert.alert('Success', 'Customer created successfully', [
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Customer' : 'Add Customer'}</Text>
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
                  {isEdit ? 'Update Customer' : 'Create Customer'}
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
