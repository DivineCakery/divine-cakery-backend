import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store';
import apiService from '../services/api';
import ForceUpdateModal from '../components/ForceUpdateModal';

export default function RootLayout() {
  const loadUser = useAuthStore((state) => state.loadUser);
  const [showForceUpdate, setShowForceUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [requiredVersion, setRequiredVersion] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');

  useEffect(() => {
    loadUser();
    checkForForceUpdate();
  }, []);

  const checkForForceUpdate = async () => {
    try {
      // Only check on Android
      if (Platform.OS !== 'android') {
        return;
      }

      // Get current app version
      const currentVersionCode = Constants.expoConfig?.android?.versionCode || 0;
      const currentVersionString = Constants.expoConfig?.version || '1.0.0';
      setCurrentVersion(currentVersionString);

      console.log('Force Update Check - Current version code:', currentVersionCode);

      // Fetch version info from backend
      const versionInfo = await apiService.getLatestAppVersion();
      console.log('Force Update Check - Server response:', versionInfo);

      // Check if force update is required
      const minimumVersionCode = versionInfo.minimum_supported_version_code;
      
      if (minimumVersionCode && currentVersionCode < minimumVersionCode) {
        console.log('Force Update Required! Current:', currentVersionCode, 'Minimum:', minimumVersionCode);
        setRequiredVersion(versionInfo.minimum_supported_version || versionInfo.latest_version);
        setUpdateMessage(versionInfo.update_message);
        setShowForceUpdate(true);
      } else {
        console.log('App is up to date or force update not required');
      }
    } catch (error) {
      console.error('Error checking for force update:', error);
      // Don't block app if we can't check - fail gracefully
    }
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(admin)" />
      </Stack>
      
      {/* Force Update Modal - blocks entire app when shown */}
      <ForceUpdateModal
        visible={showForceUpdate}
        currentVersion={currentVersion}
        requiredVersion={requiredVersion}
        updateMessage={updateMessage}
      />
    </>
  );
}
