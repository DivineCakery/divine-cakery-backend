import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../../utils/alerts';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const REMEMBER_ME_KEY = '@divine_cakery_remember_me';
const SAVED_CREDENTIALS_KEY = '@divine_cakery_credentials';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load saved credentials on mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedRememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      if (savedRememberMe === 'true') {
        setRememberMe(true);
        const savedCredentials = await AsyncStorage.getItem(SAVED_CREDENTIALS_KEY);
        if (savedCredentials) {
          const { username: savedUsername, password: savedPassword } = JSON.parse(savedCredentials);
          setUsername(savedUsername || '');
          setPassword(savedPassword || '');
        }
      }
    } catch (error) {
      console.log('Error loading saved credentials:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const saveCredentials = async () => {
    try {
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
        await AsyncStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify({ username, password }));
      } else {
        await AsyncStorage.removeItem(REMEMBER_ME_KEY);
        await AsyncStorage.removeItem(SAVED_CREDENTIALS_KEY);
      }
    } catch (error) {
      console.log('Error saving credentials:', error);
    }
  };

  const handleRememberMeToggle = async () => {
    const newValue = !rememberMe;
    setRememberMe(newValue);
    
    // If turning off, clear saved credentials
    if (!newValue) {
      try {
        await AsyncStorage.removeItem(REMEMBER_ME_KEY);
        await AsyncStorage.removeItem(SAVED_CREDENTIALS_KEY);
      } catch (error) {
        console.log('Error clearing credentials:', error);
      }
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      
      // Save credentials if remember me is checked
      await saveCredentials();
      
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

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

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
              placeholder="Username: single word"
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

          {/* Remember Me Checkbox */}
          <TouchableOpacity
            style={styles.rememberMeContainer}
            onPress={handleRememberMeToggle}
            disabled={loading}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && (
                <MaterialCommunityIcons name="check" size={16} color="#fff" />
              )}
            </View>
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </TouchableOpacity>

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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8B4513',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
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
  forgotPasswordButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#8B4513',
    fontSize: 14,
    textDecorationLine: 'underline',
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
