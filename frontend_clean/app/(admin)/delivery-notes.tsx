import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

export default function DeliveryNotesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiService.getDeliveryNotes();
      setEnabled(data.enabled);
      setMessage(data.message);
    } catch (error) {
      console.error('Error fetching delivery notes:', error);
      showAlert('Error', 'Failed to load delivery notes settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (enabled && !message.trim()) {
      showAlert('Error', 'Please enter a delivery note message');
      return;
    }

    setSaving(true);
    try {
      await apiService.updateDeliveryNotes(enabled, message);
      showAlert('Success', 'Delivery notes settings updated successfully');
    } catch (error) {
      console.error('Error saving delivery notes:', error);
      showAlert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Notes</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#8B4513" />
          <Text style={styles.infoText}>
            When enabled, customers will see a popup with your special delivery note when they place an order.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <View style={styles.toggleLabel}>
              <Ionicons name="notifications" size={20} color="#8B4513" />
              <Text style={styles.label}>Enable Delivery Notes</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleButton, enabled && styles.toggleButtonActive]}
              onPress={() => setEnabled(!enabled)}
              disabled={saving}
            >
              <View style={[styles.toggleCircle, enabled && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            {enabled ? 'Delivery notes popup will be shown to customers' : 'Delivery notes popup is disabled'}
          </Text>
        </View>

        {enabled && (
          <View style={styles.section}>
            <Text style={styles.label}>Delivery Note Message</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Enter your special delivery note for customers..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              editable={!saving}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              This message will be shown to customers before they confirm their order.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>
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
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  messageInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 150,
  },
  saveButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    marginTop: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
