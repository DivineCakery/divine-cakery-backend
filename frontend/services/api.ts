import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Backend URL - Use Constants.expoConfig for production builds, fallback to env for development
const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                     process.env.EXPO_PUBLIC_BACKEND_URL || 
                     'http://localhost:8001';

console.log('API_BASE_URL configured as:', API_BASE_URL);
console.log('Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL:', Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL);
console.log('process.env.EXPO_PUBLIC_BACKEND_URL:', process.env.EXPO_PUBLIC_BACKEND_URL);

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 15000,  // 15 seconds - balanced timeout for Render backend
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

  // Debug method to get the base URL being used
  getBaseURL() {
    return API_BASE_URL;
  }

  // Method to get full configuration info for debugging
  getDebugInfo() {
    return {
      API_BASE_URL,
      'Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL': Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL,
      'process.env.EXPO_PUBLIC_BACKEND_URL': process.env.EXPO_PUBLIC_BACKEND_URL,
      'axios.baseURL': this.api.defaults.baseURL,
    };
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

  // Password Reset APIs
  async requestPasswordReset(identifier: string) {
    const response = await this.api.post('/auth/request-password-reset', { identifier });
    return response.data;
  }

  async verifyOTP(identifier: string, otp: string) {
    const response = await this.api.post('/auth/verify-otp', { identifier, otp });
    return response.data;
  }

  async resetPassword(reset_token: string, new_password: string) {
    const response = await this.api.post('/auth/reset-password', { reset_token, new_password });
    return response.data;
  }

  // App Version API
  async getLatestAppVersion() {
    const response = await this.api.get('/app-version/latest');
    return response.data;
  }



  // Product APIs
  async getProducts(category?: string, isAvailable?: boolean, includeAdmin: boolean = false) {
    const params: any = {};
    if (category) params.category = category;
    if (isAvailable !== undefined) params.is_available = isAvailable;
    if (includeAdmin) params.include_admin = 'true';
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

  // Favorites APIs
  async addToFavorites(productId: string) {
    const response = await this.api.post(`/favorites/add/${productId}`);
    return response.data;
  }

  async removeFromFavorites(productId: string) {
    const response = await this.api.delete(`/favorites/remove/${productId}`);
    return response.data;
  }

  async getFavorites() {
    const response = await this.api.get('/favorites');
    return response.data;
  }

  // User Approval APIs
  async getPendingUsers() {
    const response = await this.api.get('/admin/pending-users');
    return response.data;
  }

  async approveUser(userId: string) {
    const response = await this.api.put(`/admin/users/${userId}/approve`);
    return response.data;
  }

  async rejectUser(userId: string) {
    const response = await this.api.put(`/admin/users/${userId}/reject`);
    return response.data;
  }

  async toggleUserActiveStatus(userId: string) {
    const response = await this.api.put(`/admin/users/${userId}/toggle-active`);
    return response.data;
  }

  // Category APIs
  async getCategories() {
    const response = await this.api.get('/categories');
    return response.data;
  }

  async createCategory(data: { name: string; display_order: number }) {
    const response = await this.api.post('/admin/categories', data);
    return response.data;
  }

  async updateCategory(id: string, data: { name?: string; display_order?: number }) {
    const response = await this.api.put(`/admin/categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: string) {
    const response = await this.api.delete(`/admin/categories/${id}`);
    return response.data;
  }

  // Wallet APIs
  async getWallet() {
    const response = await this.api.get('/wallet');
    return response.data;
  }

  async addWalletBalanceByAdmin(userId: string, amount: number) {
    const response = await this.api.post(`/admin/users/${userId}/add-wallet-balance`, null, {
      params: { amount }
    });
    return response.data;
  }

  // Payment APIs
  async createPaymentOrder(data: { amount: number; transaction_type: string; notes?: any } | number, transactionType?: string, notes?: any) {
    // Support both old signature (amount, type, notes) and new signature (object)
    let payload;
    if (typeof data === 'object') {
      payload = data;
    } else {
      payload = {
        amount: data,
        transaction_type: transactionType!,
        notes,
      };
    }
    const response = await this.api.post('/payments/create-order', payload);
    return response.data;
  }

  async verifyPayment(data: any) {
    const response = await this.api.post('/payments/verify', {
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
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

  async getTransactionStatus(transactionId: string) {
    const response = await this.api.get(`/transactions/${transactionId}`);
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

  async bulkDeleteUsers(userIds: string[]) {
    const response = await this.api.post('/admin/users/bulk-delete', userIds);
    return response.data;
  }

  // Order Agent Management
  async createOrderAgent(ownerId: string, agentData: any) {
    const response = await this.api.post(`/admin/create-order-agent?owner_id=${ownerId}`, agentData);
    return response.data;
  }

  async getLinkedAgent(ownerId: string) {
    const response = await this.api.get(`/admin/get-linked-agent/${ownerId}`);
    return response.data;
  }

  async unlinkOrderAgent(agentId: string) {
    const response = await this.api.delete(`/admin/unlink-order-agent/${agentId}`);
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

  async getPreparationListReport(date?: string) {
    const params = date ? { date } : {};
    const response = await this.api.get('/admin/reports/preparation-list', { params });
    return response.data;
  }

  // Delivery Charge Settings
  async getDeliveryCharge() {
    const response = await this.api.get('/settings/delivery-charge');
    return response.data;
  }

  async getDeliveryChargeAdmin() {
    const response = await this.api.get('/admin/settings/delivery-charge');
    return response.data;
  }

  async updateDeliveryCharge(deliveryCharge: number) {
    const response = await this.api.put(`/admin/settings/delivery-charge?delivery_charge=${deliveryCharge}`);
    return response.data;
  }

  // Discount Management
  async getAllDiscounts() {
    const response = await this.api.get('/admin/discounts');
    return response.data;
  }

  async getCustomerDiscount(customerId: string) {
    const response = await this.api.get(`/admin/discounts/customer/${customerId}`);
    return response.data;
  }

  async createDiscount(discountData: any) {
    const response = await this.api.post('/admin/discounts', discountData);
    return response.data;
  }

  async updateDiscount(discountId: string, discountData: any) {
    const response = await this.api.put(`/admin/discounts/${discountId}`, discountData);
    return response.data;
  }

  async deleteDiscount(discountId: string) {
    const response = await this.api.delete(`/admin/discounts/${discountId}`);
    return response.data;
  }

  // Standing Orders Management
  async createStandingOrder(standingOrderData: any) {
    const response = await this.api.post('/admin/standing-orders', standingOrderData);
    return response.data;
  }

  async getStandingOrders(status?: string) {
    const params = status ? { status } : {};
    const response = await this.api.get('/admin/standing-orders', { params });
    return response.data;
  }

  async getStandingOrder(standingOrderId: string) {
    const response = await this.api.get(`/admin/standing-orders/${standingOrderId}`);
    return response.data;
  }

  async getGeneratedOrders(standingOrderId: string) {
    const response = await this.api.get(`/admin/standing-orders/${standingOrderId}/generated-orders`);
    return response.data;
  }

  async updateStandingOrder(standingOrderId: string, standingOrderData: any) {
    const response = await this.api.put(`/admin/standing-orders/${standingOrderId}`, standingOrderData);
    return response.data;
  }

  async deleteStandingOrder(standingOrderId: string) {
    const response = await this.api.delete(`/admin/standing-orders/${standingOrderId}`);
    return response.data;
  }

  async regenerateStandingOrderOrders(standingOrderId: string, daysAhead: number = 10) {
    const response = await this.api.post(`/admin/standing-orders/${standingOrderId}/regenerate?days_ahead=${daysAhead}`);
    return response.data;
  }

  // Stock Reset Methods
  async resetAllStock() {
    const response = await this.api.post('/admin/stock/reset-all');
    return response.data;
  }

  async getStockResetHistory(limit: number = 30) {
    const response = await this.api.get(`/admin/stock/reset-history?limit=${limit}`);
    return response.data;
  }
}

export default new ApiService();
