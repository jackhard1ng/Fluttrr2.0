import { Tabs, useRouter } from 'expo-router';
import { Text, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';

export default function AdminTabLayout() {
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.replace('/');
    }
  }, [isAuthenticated, isAdmin, router]);

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.dark, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.error} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.error,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛡️</Text>,
        }}
      />
      <Tabs.Screen
        name="(businesses)"
        options={{
          title: 'Businesses',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏪</Text>,
        }}
      />
      <Tabs.Screen
        name="(users)"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text>,
        }}
      />
      <Tabs.Screen
        name="(reports)"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🚩</Text>,
        }}
      />
      <Tabs.Screen
        name="(messages)"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📨</Text>,
        }}
      />
    </Tabs>
  );
}
