import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          AsyncStorage.removeItem('authToken');
          AsyncStorage.removeItem('user');
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth APIs
  async register(userData: any) {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async login(username: string, password: string) {
    const response = await this.api.post('/auth/login', { username, password });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Product APIs
  async getProducts(category?: string, isAvailable?: boolean) {
    const params: any = {};
    if (category) params.category = category;
    if (isAvailable !== undefined) params.is_available = isAvailable;
    const response = await this.api.get('/products', { params });
    return response.data;
  }

  async getProduct(productId: string) {
    const response = await this.api.get(`/products/${productId}`);
    return response.data;
  }

  async createProduct(productData: any) {
    const response = await this.api.post('/products', productData);
    return response.data;
  }

  async updateProduct(productId: string, productData: any) {
    const response = await this.api.put(`/products/${productId}`, productData);
    return response.data;
  }

  async deleteProduct(productId: string) {
    const response = await this.api.delete(`/products/${productId}`);
    return response.data;
  }

  // Wallet APIs
  async getWallet() {
    const response = await this.api.get('/wallet');
    return response.data;
  }

  // Payment APIs
  async createPaymentOrder(amount: number, transactionType: string, notes?: any) {
    const response = await this.api.post('/payments/create-order', {
      amount,
      transaction_type: transactionType,
      notes,
    });
    return response.data;
  }

  async verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
    const response = await this.api.post('/payments/verify', {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    });
    return response.data;
  }

  // Order APIs
  async createOrder(orderData: any) {
    const response = await this.api.post('/orders', orderData);
    return response.data;
  }

  async getOrders(deliveryDate?: string) {
    const params: any = {};
    if (deliveryDate) params.delivery_date = deliveryDate;
    const response = await this.api.get('/orders', { params });
    return response.data;
  }

  async getOrder(orderId: string) {
    const response = await this.api.get(`/orders/${orderId}`);
    return response.data;
  }

  async updateOrder(orderId: string, orderData: any) {
    const response = await this.api.put(`/orders/${orderId}`, orderData);
    return response.data;
  }

  // Transaction APIs
  async getTransactions() {
    const response = await this.api.get('/transactions');
    return response.data;
  }

  // Admin APIs
  async getAllUsers() {
    const response = await this.api.get('/admin/users');
    return response.data;
  }

  async createUserByAdmin(userData: any) {
    const response = await this.api.post('/admin/users', userData);
    return response.data;
  }

  async updateUserByAdmin(userId: string, userData: any) {
    const response = await this.api.put(`/admin/users/${userId}`, userData);
    return response.data;
  }

  async deleteUserByAdmin(userId: string) {
    const response = await this.api.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async getAdminStats() {
    const response = await this.api.get('/admin/stats');
    return response.data;
  }

  async getDailyRevenue() {
    const response = await this.api.get('/admin/revenue/daily');
    return response.data;
  }

  // Delivery Notes Management (Admin)
  async getDeliveryNotes() {
    const response = await this.api.get('/admin/delivery-notes');
    return response.data;
  }

  async updateDeliveryNotes(enabled: boolean, message: string) {
    const response = await this.api.post('/admin/delivery-notes', { enabled, message });
    return response.data;
  }

  // Delivery Notes (Customer)
  async getCustomerDeliveryNotes() {
    const response = await this.api.get('/delivery-notes');
    return response.data;
  }

  // Reports
  async getDailyItemsReport(date?: string) {
    const params = date ? { date } : {};
    const response = await this.api.get('/admin/reports/daily-items', { params });
    return response.data;
  }
}

export default new ApiService();
