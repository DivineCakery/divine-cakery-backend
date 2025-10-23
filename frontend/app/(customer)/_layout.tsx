import { Tabs, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import apiService from '../../services/api';

export default function CustomerLayout() {
  const insets = useSafeAreaInsets();
  const [favoritesCount, setFavoritesCount] = useState(0);

  // Fetch favorites count
  const fetchFavoritesCount = async () => {
    try {
      const favorites = await apiService.getFavorites();
      setFavoritesCount(favorites.length);
    } catch (error) {
      console.error('Error fetching favorites count:', error);
    }
  };

  // Refresh favorites count when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      fetchFavoritesCount();
    }, [])
  );
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#8B4513',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: insets.bottom > 0 ? 60 + insets.bottom : 65,
        },
      }}
    >
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bread-slice" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={favoritesCount > 0 ? "heart" : "heart-outline"} 
              size={size} 
              color={favoritesCount > 0 ? "#FF0000" : color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="clipboard-list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
