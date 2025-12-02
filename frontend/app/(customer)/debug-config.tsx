import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import apiService from '../../services/api';

export default function DebugConfigScreen() {
  const router = useRouter();
  const [testResult, setTestResult] = useState('');

  const debugInfo = apiService.getDebugInfo();

  const testConnection = async () => {
    try {
      setTestResult('Testing connection...');
      const products = await apiService.getProducts();
      setTestResult(`✅ SUCCESS! Fetched ${products.length} products`);
    } catch (error: any) {
      setTestResult(`❌ ERROR: ${error.message}\nCode: ${error.code || 'N/A'}\nStatus: ${error.response?.status || 'N/A'}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Debug Configuration</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Version</Text>
        <Text style={styles.infoText}>
          Version: {Constants.expoConfig?.version || 'N/A'}
        </Text>
        <Text style={styles.infoText}>
          Build: {Constants.expoConfig?.android?.versionCode || 'N/A'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Configuration</Text>
        <Text style={styles.label}>Resolved API Base URL:</Text>
        <Text style={[styles.valueText, styles.highlight]}>
          {debugInfo.API_BASE_URL}
        </Text>

        <Text style={styles.label}>From Constants.expoConfig:</Text>
        <Text style={styles.valueText}>
          {debugInfo['Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL'] || 'Not set'}
        </Text>

        <Text style={styles.label}>From process.env:</Text>
        <Text style={styles.valueText}>
          {debugInfo['process.env.EXPO_PUBLIC_BACKEND_URL'] || 'Not set'}
        </Text>

        <Text style={styles.label}>Axios Base URL:</Text>
        <Text style={styles.valueText}>
          {debugInfo['axios.baseURL']}
        </Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.testButton} onPress={testConnection}>
          <Text style={styles.testButtonText}>Test Backend Connection</Text>
        </TouchableOpacity>
        {testResult ? (
          <View style={styles.testResult}>
            <Text style={styles.testResultText}>{testResult}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Info</Text>
        <Text style={styles.infoText}>
          Platform: {Constants.platform?.android ? 'Android' : 'iOS'}
        </Text>
        <Text style={styles.infoText}>
          App Ownership: {Constants.appOwnership || 'N/A'}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>ℹ️ How to Use This Screen</Text>
        <Text style={styles.infoBoxText}>
          1. Check which backend URL is being used
          {'\n'}2. Tap "Test Backend Connection" to verify connectivity
          {'\n'}3. Take a screenshot and share with support if needed
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#8B4513',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
  highlight: {
    backgroundColor: '#fff3cd',
    borderWidth: 2,
    borderColor: '#ffc107',
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: '#8B4513',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testResult: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  testResultText: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
