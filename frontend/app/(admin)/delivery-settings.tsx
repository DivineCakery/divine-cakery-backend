import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

export default function DeliverySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMessages, setSavingMessages] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [paidOrderMessage, setPaidOrderMessage] = useState('');
  const [payLaterMessage, setPayLaterMessage] = useState('');
  
  // App Version Settings
  const [latestVersion, setLatestVersion] = useState('');
  const [latestVersionCode, setLatestVersionCode] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [forceUpdateEnabled, setForceUpdateEnabled] = useState(false);
  const [minVersion, setMinVersion] = useState('');
  const [minVersionCode, setMinVersionCode] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [deliveryData, messagesData, versionData] = await Promise.all([
        apiService.getDeliveryChargeAdmin(),
        apiService.getOrderConfirmationMessages(),
        apiService.getAppVersionSettings()
      ]);
      setDeliveryCharge(deliveryData.delivery_charge.toString());
      setPaidOrderMessage(messagesData.paid_order_message || '');
      setPayLaterMessage(messagesData.pay_later_message || '');
      
      // App Version Settings
      setLatestVersion(versionData.latest_version || '');
      setLatestVersionCode(versionData.latest_version_code?.toString() || '');
      setReleaseDate(versionData.release_date || '');
      setUpdateMessage(versionData.update_message || '');
      setForceUpdateEnabled(versionData.force_update_enabled || false);
      setMinVersion(versionData.minimum_supported_version || '');
      setMinVersionCode(versionData.minimum_supported_version_code?.toString() || '0');
    } catch (error) {
      console.error('Error fetching settings:', error);
      showAlert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeliveryCharge = async () => {
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

  const handleSaveMessages = async () => {
    if (!paidOrderMessage.trim() || !payLaterMessage.trim()) {
      showAlert('Error', 'Please enter both confirmation messages');
      return;
    }

    setSavingMessages(true);
    try {
      await apiService.updateOrderConfirmationMessages(paidOrderMessage, payLaterMessage);
      showAlert('Success', 'Order confirmation messages updated successfully');
    } catch (error: any) {
      console.error('Error updating messages:', error);
      showAlert('Error', error.response?.data?.detail || 'Failed to update messages');
    } finally {
      setSavingMessages(false);
    }
  };

  const handleSaveVersionSettings = async () => {
    if (!latestVersion.trim() || !latestVersionCode.trim()) {
      showAlert('Error', 'Please enter latest version and version code');
      return;
    }

    const versionCode = parseInt(latestVersionCode);
    const minVerCode = parseInt(minVersionCode) || 0;

    if (isNaN(versionCode) || versionCode <= 0) {
      showAlert('Error', 'Please enter a valid version code (positive number)');
      return;
    }

    if (forceUpdateEnabled) {
      if (!minVersion.trim() || minVerCode <= 0) {
        showAlert('Error', 'Please enter minimum version details when force update is enabled');
        return;
      }
      if (minVerCode > versionCode) {
        showAlert('Error', 'Minimum version code cannot be greater than latest version code');
        return;
      }
    }

    setSavingVersion(true);
    try {
      await apiService.updateAppVersionSettings({
        latest_version: latestVersion,
        latest_version_code: versionCode,
        release_date: releaseDate || new Date().toISOString().split('T')[0],
        update_message: updateMessage,
        force_update_enabled: forceUpdateEnabled,
        minimum_supported_version: forceUpdateEnabled ? minVersion : '',
        minimum_supported_version_code: forceUpdateEnabled ? minVerCode : 0,
      });
      showAlert('Success', 'App version settings updated successfully');
    } catch (error: any) {
      console.error('Error updating version settings:', error);
      showAlert('Error', error.response?.data?.detail || 'Failed to update version settings');
    } finally {
      setSavingVersion(false);
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
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.content}>
        {/* Delivery Charge Card */}
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
            onPress={handleSaveDeliveryCharge}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Delivery Charge</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Order Confirmation Messages Card */}
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="chatbox-ellipses" size={50} color="#8B4513" />
          </View>
          
          <Text style={styles.sectionTitle}>Order Confirmation Messages</Text>
          <Text style={styles.sectionDescription}>
            Customize the confirmation messages shown to customers after they place an order.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Message for Paid Orders *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Thank you for your order! Your payment has been received..."
              value={paidOrderMessage}
              onChangeText={setPaidOrderMessage}
              multiline
              numberOfLines={3}
              editable={!savingMessages}
            />
            <Text style={styles.hint}>
              Shown when customer pays via Wallet or Instant Payment
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, styles.payLaterLabel]}>Message for Pay Later Orders *</Text>
            <TextInput
              style={[styles.textArea, styles.payLaterTextArea]}
              placeholder="Thank you for your order! Please make the payment upon delivery..."
              value={payLaterMessage}
              onChangeText={setPayLaterMessage}
              multiline
              numberOfLines={3}
              editable={!savingMessages}
            />
            <Text style={styles.hint}>
              Shown when customer uses "Pay Later" option
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, savingMessages && styles.saveButtonDisabled]}
            onPress={handleSaveMessages}
            disabled={savingMessages}
          >
            {savingMessages ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Messages</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* App Version Settings Card */}
        <View style={[styles.card, styles.versionCard]}>
          <View style={styles.iconContainer}>
            <Ionicons name="phone-portrait" size={50} color="#8B4513" />
          </View>
          
          <Text style={styles.sectionTitle}>App Version Settings</Text>
          <Text style={styles.sectionDescription}>
            Configure the current app version on Play Store and force update requirements.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Latest Version (e.g., 1.0.16) *</Text>
            <TextInput
              style={styles.versionInput}
              placeholder="1.0.16"
              value={latestVersion}
              onChangeText={setLatestVersion}
              editable={!savingVersion}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Latest Version Code (e.g., 96) *</Text>
            <TextInput
              style={styles.versionInput}
              placeholder="96"
              value={latestVersionCode}
              onChangeText={setLatestVersionCode}
              keyboardType="number-pad"
              editable={!savingVersion}
            />
            <Text style={styles.hint}>
              This is the build number from app.json (versionCode)
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Update Message (optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="New features and improvements..."
              value={updateMessage}
              onChangeText={setUpdateMessage}
              multiline
              numberOfLines={2}
              editable={!savingVersion}
            />
          </View>

          {/* Force Update Toggle */}
          <View style={styles.forceUpdateContainer}>
            <View style={styles.forceUpdateHeader}>
              <Ionicons name="shield-checkmark" size={24} color={forceUpdateEnabled ? '#E65100' : '#999'} />
              <View style={styles.forceUpdateTextContainer}>
                <Text style={styles.forceUpdateTitle}>Force Update</Text>
                <Text style={styles.forceUpdateSubtitle}>
                  {forceUpdateEnabled ? 'Users MUST update to continue' : 'Users can skip update'}
                </Text>
              </View>
              <Switch
                value={forceUpdateEnabled}
                onValueChange={setForceUpdateEnabled}
                trackColor={{ false: '#ccc', true: '#FFCC80' }}
                thumbColor={forceUpdateEnabled ? '#E65100' : '#f4f3f4'}
              />
            </View>
          </View>

          {forceUpdateEnabled && (
            <View style={styles.minVersionContainer}>
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={20} color="#E65100" />
                <Text style={styles.warningBannerText}>
                  Users with versions below minimum will be blocked from using the app
                </Text>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.label, styles.minVersionLabel]}>Minimum Version *</Text>
                <TextInput
                  style={[styles.versionInput, styles.minVersionInput]}
                  placeholder="1.0.16"
                  value={minVersion}
                  onChangeText={setMinVersion}
                  editable={!savingVersion}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, styles.minVersionLabel]}>Minimum Version Code *</Text>
                <TextInput
                  style={[styles.versionInput, styles.minVersionInput]}
                  placeholder="96"
                  value={minVersionCode}
                  onChangeText={setMinVersionCode}
                  keyboardType="number-pad"
                  editable={!savingVersion}
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, savingVersion && styles.saveButtonDisabled]}
            onPress={handleSaveVersionSettings}
            disabled={savingVersion}
          >
            {savingVersion ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Version Settings</Text>
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
              "Pay Later" enabled customers can place orders without immediate payment
            </Text>
          </View>
          <View style={styles.infoBullet}>
            <Ionicons name="ellipse" size={8} color="#666" />
            <Text style={styles.infoText}>
              Enable "Pay Later" for specific customers in the Manage Users section
            </Text>
          </View>
          <View style={styles.infoBullet}>
            <Ionicons name="ellipse" size={8} color="#666" />
            <Text style={styles.infoText}>
              Force Update blocks users with older app versions until they update
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
  payLaterLabel: {
    color: '#E65100',
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
  textArea: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  payLaterTextArea: {
    borderColor: '#FFCC80',
    backgroundColor: '#FFF8E1',
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
