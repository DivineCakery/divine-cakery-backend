import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
    shelf_life: '',
    storage_instructions: '',
    food_type: 'veg',
    ingredients: '',
    allergen_info: '',
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
      showAlert('Error', 'Failed to load categories');
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
        shelf_life: product.shelf_life || '',
        storage_instructions: product.storage_instructions || '',
        food_type: product.food_type || 'veg',
      });
      // Set selected categories from product data
      if (product.categories && product.categories.length > 0) {
        setSelectedCategories(product.categories);
      } else if (product.category) {
        // Backward compatibility: if no categories array, use category field
        setSelectedCategories([product.category]);
      }
    } catch (error) {
      showAlert('Error', 'Failed to load product');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showAlert('Permission Required', 'Please allow access to your photo library');
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
      showAlert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_base64: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.mrp) {
      showAlert('Validation Error', 'Please fill in Product Name, MRP, and Price');
      return;
    }

    if (selectedCategories.length === 0) {
      showAlert('Validation Error', 'Please select at least one category');
      return;
    }

    const mrp = parseFloat(formData.mrp);
    const price = parseFloat(formData.price);

    if (isNaN(mrp) || isNaN(price)) {
      showAlert('Validation Error', 'MRP and Price must be valid numbers');
      return;
    }

    if (price > mrp) {
      showAlert('Validation Error', 'Price cannot be greater than MRP');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        category: selectedCategories[0], // Primary category for backward compatibility
        categories: selectedCategories, // New multi-category support
        mrp: mrp,
        price: price,
        packet_size: formData.packet_size || undefined,
        unit: formData.unit,
        description: formData.description || undefined,
        remarks: formData.remarks || undefined,
        image_base64: formData.image_base64 || undefined,
        is_available: true,
        shelf_life: formData.shelf_life || undefined,
        storage_instructions: formData.storage_instructions || undefined,
        food_type: formData.food_type,
      };

      if (isEdit) {
        await apiService.updateProduct(productId, productData);
        showAlert('Success', 'Product updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await apiService.createProduct(productData);
        showAlert('Success', 'Product created successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to save product');
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

          <Text style={styles.label}>Categories * (Select one or more)</Text>
          {categories.length === 0 ? (
            <Text style={styles.noCategoriesText}>No categories available. Please create categories first.</Text>
          ) : (
            <View style={styles.categoryContainer}>
              {categories.map((cat: any) => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        // Remove category
                        setSelectedCategories(selectedCategories.filter(c => c !== cat.name));
                      } else {
                        // Add category
                        setSelectedCategories([...selectedCategories, cat.name]);
                      }
                    }}
                    disabled={loading}
                  >
                    <Ionicons 
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                      size={20} 
                      color={isSelected ? "#fff" : "#8B4513"} 
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {selectedCategories.length > 0 && (
            <Text style={styles.selectedCategoriesText}>
              Selected: {selectedCategories.join(', ')}
            </Text>
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

          <Text style={styles.label}>Shelf Life</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 3-5 days, 1 week at room temperature"
            value={formData.shelf_life}
            onChangeText={(text) => setFormData({ ...formData, shelf_life: text })}
            editable={!loading}
          />

          <Text style={styles.label}>Storage Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g., Store in a cool, dry place away from direct sunlight"
            value={formData.storage_instructions}
            onChangeText={(text) => setFormData({ ...formData, storage_instructions: text })}
            multiline
            numberOfLines={2}
            editable={!loading}
          />

          <Text style={styles.label}>Food Type (FSSAI)</Text>
          <View style={styles.foodTypeContainer}>
            <TouchableOpacity
              style={[
                styles.foodTypeButton,
                formData.food_type === 'veg' && styles.foodTypeButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, food_type: 'veg' })}
              disabled={loading}
            >
              <View style={[styles.fssaiDot, styles.vegDot]} />
              <Text style={styles.foodTypeText}>Vegetarian</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.foodTypeButton,
                formData.food_type === 'non-veg' && styles.foodTypeButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, food_type: 'non-veg' })}
              disabled={loading}
            >
              <View style={[styles.fssaiDot, styles.nonVegDot]} />
              <Text style={styles.foodTypeText}>Non-Vegetarian</Text>
            </TouchableOpacity>
          </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
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
  selectedCategoriesText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: -5,
    marginBottom: 10,
    fontStyle: 'italic',
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
  foodTypeContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  foodTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  foodTypeButtonActive: {
    borderColor: '#8B4513',
    backgroundColor: '#FFF8DC',
  },
  foodTypeText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '600',
  },
  fssaiDot: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
  },
  vegDot: {
    backgroundColor: '#00A651',
    borderColor: '#00A651',
  },
  nonVegDot: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
});
