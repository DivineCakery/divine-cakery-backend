import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
  BackHandler,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.divinecakery.app';

interface ForceUpdateModalProps {
  visible: boolean;
  currentVersion: string;
  requiredVersion: string;
  updateMessage?: string;
}

export default function ForceUpdateModal({
  visible,
  currentVersion,
  requiredVersion,
  updateMessage,
}: ForceUpdateModalProps) {
  
  // Prevent back button from closing the modal on Android
  React.useEffect(() => {
    if (visible && Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Return true to prevent default back behavior
        return true;
      });
      return () => backHandler.remove();
    }
  }, [visible]);

  const handleUpdate = async () => {
    try {
      const canOpen = await Linking.canOpenURL(PLAY_STORE_URL);
      if (canOpen) {
        await Linking.openURL(PLAY_STORE_URL);
      }
    } catch (error) {
      console.error('Error opening Play Store:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {}} // Prevent closing
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download" size={60} color="#8B4513" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Update Required</Text>

          {/* Message */}
          <Text style={styles.message}>
            {updateMessage || 'A new version of Divine Cakery is available with important updates and improvements.'}
          </Text>

          {/* Version Info */}
          <View style={styles.versionInfo}>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Your version:</Text>
              <Text style={styles.versionValue}>{currentVersion}</Text>
            </View>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Required version:</Text>
              <Text style={[styles.versionValue, styles.requiredVersion]}>{requiredVersion}</Text>
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#E65100" />
            <Text style={styles.warningText}>
              You must update to continue using the app
            </Text>
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            activeOpacity={0.8}
          >
            <Ionicons name="download" size={22} color="#fff" />
            <Text style={styles.updateButtonText}>Update Now</Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footer}>
            Thank you for using Divine Cakery!
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF8DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  versionInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginBottom: 15,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  versionLabel: {
    fontSize: 14,
    color: '#666',
  },
  versionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  requiredVersion: {
    color: '#4CAF50',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    marginLeft: 10,
    flex: 1,
  },
  updateButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 15,
    gap: 10,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
