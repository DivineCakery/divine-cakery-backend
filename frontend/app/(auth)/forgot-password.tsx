import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { DIVINE_WHATSAPP_ADMIN_ALERT } from '../../constants/whatsapp';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    if (!identifier.trim()) {
      showAlert('Error', 'Please enter your username or phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.requestPasswordReset(identifier);
      
      // Create message for admin with OTP and customer details
      const adminMessage = `🔐 *Password Reset Request*

*Customer:* ${response.username || identifier}
*Phone:* ${response.phone || 'N/A'}
*OTP:* ${response.otp}
*Valid for:* 10 minutes

Please send this OTP to the customer via WhatsApp or call.`;

      // Open WhatsApp to admin with the OTP details
      const adminPhoneNumber = DIVINE_WHATSAPP_ADMIN_ALERT;
      const whatsappUrl = `whatsapp://send?phone=${adminPhoneNumber}&text=${encodeURIComponent(adminMessage)}`;
      
      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          // Fallback to web WhatsApp
          const webUrl = `https://wa.me/${adminPhoneNumber}?text=${encodeURIComponent(adminMessage)}`;
          await Linking.openURL(webUrl);
        }
      } catch (linkError) {
        console.log('Could not open WhatsApp for admin notification:', linkError);
      }
      
      // Navigate to reset password screen
      showAlert(
        'OTP Request Sent',
        `Your password reset request has been sent to Divine Cakery support.\n\nYou will receive an OTP on your registered phone number (${response.phone || 'your phone'}) shortly.\n\nPlease wait for the OTP and enter it in the next screen.`,
        [
          {
            text: 'Continue',
            onPress: () => router.push({
              pathname: '/(auth)/reset-password',
              params: { identifier }
            })
          }
        ]
      );
    } catch (error: any) {
      console.error('Error requesting password reset:', error);
      showAlert(
        'Error',
        error.response?.data?.detail || 'Failed to request password reset. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#8B4513" />
          </TouchableOpacity>
          <Text style={styles.title}>Reset Password</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed-outline" size={80} color="#8B4513" />
          </View>

          <Text style={styles.subtitle}>Forgot your password?</Text>
          <Text style={styles.description}>
            Enter your username or phone number. Our support team will send you an OTP via WhatsApp to reset your password.
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username or Phone Number"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRequestReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="mail-outline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Request OTP</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#8B4513" />
            <Text style={styles.infoText}>
              After requesting, our team will send you a 6-digit OTP via WhatsApp. This usually takes a few minutes.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF8DC',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 24,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8B4513',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8DC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  backToLoginButton: {
    alignItems: 'center',
    padding: 12,
  },
  backToLoginText: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '600',
  },
});
