import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import apiService from '../services/api';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.divinecakery.app';
const DISMISS_KEY = 'update_banner_dismissed_date';
const VERSION_CHECKED_KEY = 'last_version_check_date';

export default function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    try {
      // Only check on Android (since this is for Play Store)
      if (Platform.OS !== 'android') {
        setIsLoading(false);
        return;
      }

      // Get current app version
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const currentVersionCode = Constants.expoConfig?.android?.versionCode || 0;

      console.log('Current app version:', currentVersion, 'Code:', currentVersionCode);

      // Check if we already dismissed today
      const lastDismissed = await AsyncStorage.getItem(DISMISS_KEY);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      if (lastDismissed === today) {
        console.log('Update banner already dismissed today');
        setIsLoading(false);
        return;
      }

      // Check if we already checked version today (avoid multiple API calls)
      const lastChecked = await AsyncStorage.getItem(VERSION_CHECKED_KEY);
      if (lastChecked === today) {
        // Already checked today, don't check again
        setIsLoading(false);
        return;
      }

      // Fetch latest version info from backend
      const versionInfo = await apiService.getLatestAppVersion();
      console.log('Latest version from backend:', versionInfo);

      // Store that we checked today
      await AsyncStorage.setItem(VERSION_CHECKED_KEY, today);

      // Check if update is available
      if (versionInfo.latest_version_code > currentVersionCode) {
        // Calculate days since release
        const releaseDate = new Date(versionInfo.release_date);
        const currentDate = new Date();
        const daysSinceRelease = Math.floor(
          (currentDate.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        console.log('Days since release:', daysSinceRelease);

        // Show banner only if version is 7+ days old
        if (daysSinceRelease >= 7) {
          setUpdateMessage(versionInfo.update_message || 'A new version is available!');
          setShowBanner(true);
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDismiss = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(DISMISS_KEY, today);
      setShowBanner(false);
    } catch (error) {
      console.error('Error dismissing banner:', error);
    }
  };

  if (isLoading || !showBanner) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.iconContainer}>
        <Ionicons name="information-circle" size={24} color="#FF9800" />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Update Available</Text>
        <Text style={styles.message}>{updateMessage}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdate}
        >
          <Text style={styles.updateButtonText}>Update</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
        >
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF3E0',
    borderBottomWidth: 2,
    borderBottomColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  updateButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dismissButton: {
    padding: 4,
  },
});
