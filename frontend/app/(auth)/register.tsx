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
import { DIVINE_WHATSAPP_NUMBER } from '../../constants/whatsapp';

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
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
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

      // Show success popup first, then send WhatsApp
      Alert.alert(
        'Registration Pending Approval',
        'Your registration is successful! Your account will be approved by the admin within 1 day.\n\nYou will receive a WhatsApp confirmation once approved.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Send WhatsApp notification to USER first
              if (formData.phone) {
                try {
                  const userMessage = `✅ *Registration Pending Approval*\n\nDear ${formData.username},\n\nThank you for registering with Divine Cakery!\n\nYour account is currently pending admin approval. You will be notified within 1 day once your account is approved.\n\n*Registration Details:*\nUsername: ${formData.username}\nBusiness: ${formData.business_name || 'N/A'}\n\nThank you for your patience!\n\n- Divine Cakery Team`;
                  const userWhatsappUrl = `whatsapp://send?phone=${formData.phone}&text=${encodeURIComponent(userMessage)}`;
                  
                  const canOpenUser = await Linking.canOpenURL(userWhatsappUrl);
                  if (canOpenUser) {
                    await Linking.openURL(userWhatsappUrl);
                  } else {
                    const webUserUrl = `https://wa.me/${formData.phone}?text=${encodeURIComponent(userMessage)}`;
                    await Linking.openURL(webUserUrl);
                  }
                } catch (error) {
                  console.log('User WhatsApp notification error:', error);
                }
              }
              
              // Then send WhatsApp notification to admin
              try {
                const adminMessage = `🔔 *New Customer Registration!*\n\nUsername: ${formData.username}\nBusiness: ${formData.business_name || 'N/A'}\nPhone: ${formData.phone || 'N/A'}\nAddress: ${formData.address || 'N/A'}\n\nPlease review and approve in Pending Approvals section.`;
                const adminWhatsappUrl = `whatsapp://send?phone=${DIVINE_WHATSAPP_NUMBER}&text=${encodeURIComponent(adminMessage)}`;
                
                const canOpenAdmin = await Linking.canOpenURL(adminWhatsappUrl);
                if (canOpenAdmin) {
                  await Linking.openURL(adminWhatsappUrl);
                } else {
                  const webAdminUrl = `https://wa.me/${DIVINE_WHATSAPP_NUMBER}?text=${encodeURIComponent(adminMessage)}`;
                  await Linking.openURL(webAdminUrl);
                }
              } catch (error) {
                console.log('Admin WhatsApp notification error:', error);
              }
              
              // Navigate to login after WhatsApp attempts
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
              placeholder="Email (optional)"
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
              placeholder="Phone (optional)"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="store" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Business Name (optional)"
              value={formData.business_name}
              onChangeText={(text) => setFormData({ ...formData, business_name: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Address (optional)"
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
