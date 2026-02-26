import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/Button';

export default function AdminDashboard() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🛡️ Admin Dashboard</Text>
      <Text style={styles.sub}>Admin features coming in Phase 7</Text>
      <Button title="Sign Out" onPress={logout} variant="danger" style={{ marginTop: 32, marginHorizontal: 20 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark, paddingTop: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.error },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 16 },
});
