import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      
      // Get the updated user from store to determine navigation
      const user = useAuthStore.getState().user;
      
      // Navigate based on user role
      if (user?.role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(customer)/products');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Invalid credentials';
      const isApprovalPending = errorMessage.includes('pending approval');
      
      showAlert(
        isApprovalPending ? 'Registration Pending Approval' : 'Login Failed',
        errorMessage
      );
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
          <Image source={require('../../assets/images/login-logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>Wholesale Bakery App</Text>
          <Text style={styles.description}>
            We are delighted to bring to you an exclusive range of breads, buns and Viennese pastries for the hotel, restaurant and catering industry. We make everything with a pride and passion that will shine through your dishes and impress your customers. Our bread products have 3-5 day shelf life in ambient surroundings and easily chilled or frozen. We provide delivery to your door step in Thiruvananthapuram city limits. Contact us at 9544183334 or Email us at contact@divinecakery.in
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock" size={24} color="#8B4513" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color="#8B4513"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => router.push('/(auth)/forgot-password')}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
            disabled={loading}
          >
            <Text style={styles.registerText}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFD700',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 180,
    height: 90,
    marginBottom: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 3,
    fontWeight: '600',
  },
  description: {
    fontSize: 11,
    color: '#555',
    marginTop: 10,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  form: {
    width: '100%',
    marginTop: 15,
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
    height: 45,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  button: {
    backgroundColor: '#8B4513',
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  registerButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  registerText: {
    color: '#8B4513',
    fontSize: 16,
  },
});
