import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/Button';

export default function BusinessDashboard() {
  const { business, logout } = useAuthStore();
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>📊 Dashboard</Text>
      <Text style={styles.name}>{business?.businessName || 'Business'}</Text>
      <Text style={styles.sub}>Business dashboard coming in Phase 6</Text>
      <Button title="Sign Out" onPress={logout} variant="danger" style={{ marginTop: 32, marginHorizontal: 20 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark, paddingTop: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  name: { fontSize: 16, color: Colors.blue, marginTop: 8 },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 16 },
});
