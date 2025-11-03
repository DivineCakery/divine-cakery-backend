import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { showAlert } from \'../../utils/alerts\';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

export default function DeliverySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState('');

  useEffect(() => {
    fetchDeliveryCharge();
  }, []);

  const fetchDeliveryCharge = async () => {
    try {
      const data = await apiService.getDeliveryChargeAdmin();
      setDeliveryCharge(data.delivery_charge.toString());
    } catch (error) {
      console.error('Error fetching delivery charge:', error);
      showAlert('Error', 'Failed to load delivery charge');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const charge = parseFloat(deliveryCharge);
    
    if (isNaN(charge) || charge < 0) {
      showAlert('Error', 'Please enter a valid delivery charge (0 or more)');
      return;
    }

    setSaving(true);
    try {
      await apiService.updateDeliveryCharge(charge);
      showAlert('Success', 'Delivery charge updated successfully');
    } catch (error: any) {
      console.error('Error updating delivery charge:', error);
      showAlert('Error', error.response?.data?.detail || 'Failed to update delivery charge');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 100}}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="bicycle" size={50} color="#8B4513" />
          </View>
          
          <Text style={styles.sectionTitle}>Delivery Charge</Text>
          <Text style={styles.sectionDescription}>
            Set the delivery charge that will be added to customer orders when they choose delivery option.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Delivery Charge (₹) *</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={deliveryCharge}
                onChangeText={setDeliveryCharge}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
            <Text style={styles.hint}>
              Enter 0 for free delivery. This charge will only apply when customers select "Delivery" option.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
            <Text style={styles.infoTitle}>How it works</Text>
          </View>
          <View style={styles.infoBullet}>
            <Ionicons name="ellipse" size={8} color="#666" />
            <Text style={styles.infoText}>
              Customers can choose between "Pickup" or "Delivery" at checkout
            </Text>
          </View>
          <View style={styles.infoBullet}>
            <Ionicons name="ellipse" size={8} color="#666" />
            <Text style={styles.infoText}>
              Delivery charge is automatically added only for delivery orders
            </Text>
          </View>
          <View style={styles.infoBullet}>
            <Ionicons name="ellipse" size={8} color="#666" />
            <Text style={styles.infoText}>
              Pickup orders have no delivery charge (₹0)
            </Text>
          </View>
          <View style={styles.infoBullet}>
            <Ionicons name="ellipse" size={8} color="#666" />
            <Text style={styles.infoText}>
              The charge is shown separately in the order breakdown
            </Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
  },
  header: {
    backgroundColor: '#8B4513',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  currency: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    padding: 15,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  infoBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
