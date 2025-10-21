import { Tabs } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const accessLevel = user?.admin_access_level || 'full';

  // Define which tabs are visible for each access level
  const canShowTab = (tabName: string) => {
    if (accessLevel === 'full') return true;
    if (accessLevel === 'limited') {
      return ['dashboard', 'manage-orders'].includes(tabName);
    }
    if (accessLevel === 'reports') {
      return ['dashboard', 'reports'].includes(tabName);
    }
    return false;
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#8B4513',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 8,
          height: insets.bottom > 0 ? 65 + insets.bottom : 70,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          href: canShowTab('dashboard') ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-products"
        options={{
          title: 'Products',
          href: canShowTab('manage-products') ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bread-slice" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-orders"
        options={{
          title: 'Orders',
          href: canShowTab('manage-orders') ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="clipboard-list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-users"
        options={{
          title: 'Users',
          href: canShowTab('manage-users') ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-profile"
        options={{
          title: 'Profile',
          href: canShowTab('admin-profile') ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="product-form"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="customer-form"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="delivery-notes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
