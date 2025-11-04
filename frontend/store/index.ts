import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';

interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: 'customer' | 'admin';
  business_name?: string;
  address?: string;
  wallet_balance: number;
  created_at: string;
  is_active: boolean;
  can_topup_wallet?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      const data = await apiService.login(username, password);
      await AsyncStorage.setItem('authToken', data.access_token);
      
      // Get user details
      const user = await apiService.getCurrentUser();
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token: data.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (userData: any) => {
    try {
      const user = await apiService.register(userData);
      // Don't auto-login since new users need admin approval
      return user;
    } catch (error: any) {
      console.error('Register error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userStr = await AsyncStorage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        
        // Verify token is still valid by fetching current user
        try {
          const currentUser = await apiService.getCurrentUser();
          set({
            user: currentUser,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token invalid, clear storage
          await get().logout();
        }
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Load user error:', error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  refreshUser: async () => {
    try {
      const user = await apiService.getCurrentUser();
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ user });
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  },
}));


interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: any, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product: any, quantity: number) => {
    const items = get().items;
    const existingItem = items.find(item => item.product_id === product.id);
    
    // Ensure price and quantity are valid numbers
    const price = parseFloat(product.price) || 0;
    const qty = parseInt(String(quantity)) || 1;
    
    if (existingItem) {
      set({
        items: items.map(item =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + qty,
                subtotal: (item.quantity + qty) * item.price,
              }
            : item
        ),
      });
    } else {
      set({
        items: [
          ...items,
          {
            product_id: product.id,
            product_name: product.name,
            quantity: qty,
            price: price,
            subtotal: qty * price,
          },
        ],
      });
    }
  },

  removeItem: (productId: string) => {
    set({
      items: get().items.filter(item => item.product_id !== productId),
    });
  },

  updateQuantity: (productId: string, quantity: number) => {
    // Ensure quantity is a valid number and at least 1
    const qty = Math.max(1, parseInt(String(quantity)) || 1);
    
    if (qty === 0) {
      get().removeItem(productId);
    } else {
      set({
        items: get().items.map(item =>
          item.product_id === productId
            ? {
                ...item,
                quantity: qty,
                subtotal: qty * item.price,
              }
            : item
        ),
      });
    }
  },

  clearCart: () => {
    set({ items: [] });
  },

  getTotalAmount: () => {
    return get().items.reduce((total, item) => total + item.subtotal, 0);
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));
