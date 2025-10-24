import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DIVINE_LOGO } from '../../constants/logo';
import { DIVINE_WHATSAPP_ADMIN_ALERT, getNewUserRegistrationAlert } from '../../constants/whatsapp';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    business_name: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Check all fields are filled
    if (!formData.username || !formData.password || !formData.confirmPassword || 
        !formData.email || !formData.phone || !formData.business_name || !formData.address) {
      Alert.alert('Error', 'All fields are mandatory. Please fill in all fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate phone format (basic validation for 10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: formData.username,
        password: formData.password,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        business_name: formData.business_name || undefined,
        address: formData.address || undefined,
      });

      // Send WhatsApp notification to admin
      const message = getNewUserRegistrationAlert(
        formData.username,
        formData.business_name || 'N/A',
        formData.phone || 'N/A',
        formData.email || 'N/A',
        formData.address || 'N/A'
      );
      const whatsappUrl = `https://wa.me/${DIVINE_WHATSAPP_ADMIN_ALERT}?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp to send admin notification
      try {
        await Linking.openURL(whatsappUrl);
      } catch (whatsappError) {
        console.log('Could not open WhatsApp:', whatsappError);
        // Continue even if WhatsApp fails to open
      }

      // Show success popup
      Alert.alert(
        'Registration Pending Approval',
        `✅ Thank you for registering with Divine Cakery!\n\n📋 Registration Details:\n• Username: ${formData.username}\n• Business: ${formData.business_name || 'N/A'}\n\n⏳ Your account is pending admin approval. You will be notified via WhatsApp within 1 day once approved.\n\nThank you for your patience!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to login
              router.replace('/login' as any);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.detail || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image source={{ uri: DIVINE_LOGO }} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>Join Divine Cakery Wholesale</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Username *"
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="phone" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Phone (10 digits) *"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="store" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Business Name *"
              value={formData.business_name}
              onChangeText={(text) => setFormData({ ...formData, business_name: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Address *"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              multiline
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password *"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-check" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.loginText}>Already have an account? Login</Text>
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
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 180,
    height: 90,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8B4513',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    color: '#8B4513',
    fontSize: 16,
  },
});
