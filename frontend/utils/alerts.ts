import { Platform, Alert } from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Web-compatible alert function
 * Works on both mobile browsers and native apps
 * Supports React Native Alert.alert button array format
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (Platform.OS === 'web') {
    // Handle web platform with window.confirm or window.alert
    if (!buttons || buttons.length === 0) {
      // Simple alert with no buttons
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      return;
    }

    if (buttons.length === 1) {
      // Single button - just show alert
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
      return;
    }

    // Multiple buttons - use confirm
    const result = window.confirm(`${title}${message ? '\n\n' + message : ''}`);
    
    if (result) {
      // User clicked OK - execute the non-cancel button
      const okButton = buttons.find(btn => btn.style !== 'cancel');
      if (okButton && okButton.onPress) {
        okButton.onPress();
      }
    } else {
      // User clicked Cancel - execute the cancel button
      const cancelButton = buttons.find(btn => btn.style === 'cancel');
      if (cancelButton && cancelButton.onPress) {
        cancelButton.onPress();
      }
    }
  } else {
    // Native platform - use React Native Alert
    Alert.alert(title, message, buttons);
  }
};
