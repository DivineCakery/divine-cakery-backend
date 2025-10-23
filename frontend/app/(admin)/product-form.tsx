import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import apiService from '../../services/api';

export default function ProductFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.id as string;
  const isEdit = !!productId;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    mrp: '',
    price: '',
    packet_size: '',
    unit: 'piece',
    description: '',
    remarks: '',
    image_base64: '',
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchProduct();
    }
  }, [productId]);

  // Refresh categories when screen gains focus (real-time update)
  useFocusEffect(
    React.useCallback(() => {
      fetchCategories();
    }, [])
  );

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
      // Set first category as default if creating new product
      if (!isEdit && data.length > 0) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const product = await apiService.getProduct(productId);
      setFormData({
        name: product.name,
        category: product.category,
        mrp: product.mrp?.toString() || '',
        price: product.price.toString(),
        packet_size: product.packet_size || '',
        unit: product.unit,
        description: product.description || '',
        remarks: product.remarks || '',
        image_base64: product.image_base64 || '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load product');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setFormData({ ...formData, image_base64: `data:image/jpeg;base64,${result.assets[0].base64}` });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_base64: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.mrp) {
      Alert.alert('Validation Error', 'Please fill in Product Name, MRP, and Price');
      return;
    }

    const mrp = parseFloat(formData.mrp);
    const price = parseFloat(formData.price);

    if (isNaN(mrp) || isNaN(price)) {
      Alert.alert('Validation Error', 'MRP and Price must be valid numbers');
      return;
    }

    if (price > mrp) {
      Alert.alert('Validation Error', 'Price cannot be greater than MRP');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        mrp: mrp,
        price: price,
        packet_size: formData.packet_size || undefined,
        unit: formData.unit,
        description: formData.description || undefined,
        remarks: formData.remarks || undefined,
        image_base64: formData.image_base64 || undefined,
        is_available: true,
      };

      if (isEdit) {
        await apiService.updateProduct(productId, productData);
        Alert.alert('Success', 'Product updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await apiService.createProduct(productData);
        Alert.alert('Success', 'Product created successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter product name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            editable={!loading}
          />

          <Text style={styles.label}>Product Image</Text>
          <View style={styles.imageContainer}>
            {formData.image_base64 ? (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: formData.image_base64 }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeImage}
                  disabled={loading}
                >
                  <Ionicons name="close-circle" size={30} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickImage}
                disabled={loading}
              >
                <Ionicons name="camera" size={40} color="#8B4513" />
                <Text style={styles.imagePickerText}>Tap to add product image</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>Category *</Text>
          {categories.length === 0 ? (
            <Text style={styles.noCategoriesText}>No categories available. Please create categories first.</Text>
          ) : (
            <View style={styles.categoryContainer}>
              {categories.map((cat: any) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    formData.category === cat.name && styles.categoryChipActive,
                  ]}
                  onPress={() => setFormData({ ...formData, category: cat.name })}
                  disabled={loading}
              >
                <Text
                  style={[
                    styles.categoryText,
                    formData.category === cat.name && styles.categoryTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>MRP (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Maximum Retail Price"
            value={formData.mrp}
            onChangeText={(text) => setFormData({ ...formData, mrp: text })}
            keyboardType="decimal-pad"
            editable={!loading}
          />

          <Text style={styles.label}>Selling Price (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your selling price"
            value={formData.price}
            onChangeText={(text) => setFormData({ ...formData, price: text })}
            keyboardType="decimal-pad"
            editable={!loading}
          />

          <Text style={styles.label}>Packet Size</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 500g, 1kg, 6 pieces"
            value={formData.packet_size}
            onChangeText={(text) => setFormData({ ...formData, packet_size: text })}
            editable={!loading}
          />

          <Text style={styles.label}>Unit</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., piece, kg, dozen, pack"
            value={formData.unit}
            onChangeText={(text) => setFormData({ ...formData, unit: text })}
            editable={!loading}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Product description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={3}
            editable={!loading}
          />

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any additional notes or remarks"
            value={formData.remarks}
            onChangeText={(text) => setFormData({ ...formData, remarks: text })}
            multiline
            numberOfLines={2}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {isEdit ? 'Update Product' : 'Create Product'}
                </Text>
              </>
            )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
  },
  header: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageContainer: {
    marginBottom: 15,
  },
  imagePicker: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#8B4513',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    marginTop: 10,
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreview: {
    position: 'relative',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  noCategoriesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  categoryChipActive: {
    backgroundColor: '#8B4513',
  },
  categoryText: {
    fontSize: 14,
    color: '#8B4513',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    marginTop: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
