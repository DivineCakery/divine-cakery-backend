import { Platform } from 'react-native';

/**
 * Web-compatible alert function
 * Works on both mobile browsers and native apps
 */
export const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    const result = window.confirm(`${title}\n\n${message}`);
    if (result && onOk) {
      onOk();
    }
  } else {
    // For native apps, use simple alert
    if (window.confirm(`${title}\n\n${message}`)) {
      if (onOk) onOk();
    }
  }
};
