import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { adminApi, type AdminUserItem } from '@/api/admin';
import { extractErrorMessage } from '@/utils/error';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const { data } = await adminApi.getUsers({ limit: 50 });
      setUsers(data.users);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => { fetchUsers().finally(() => setLoading(false)); }, [fetchUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchUsers(); setRefreshing(false);
  }, [fetchUsers]);

  const handleSuspend = (u: AdminUserItem) => {
    Alert.alert('Suspend User', `Suspend ${u.displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: async () => {
        try { await adminApi.suspendUser(u.id); fetchUsers(); } catch (e) { Alert.alert('Error', extractErrorMessage(e)); }
      }},
    ]);
  };

  const handleReinstate = async (u: AdminUserItem) => {
    try { await adminApi.reinstateUser(u.id); fetchUsers(); } catch (e) { Alert.alert('Error', extractErrorMessage(e)); }
  };

  const renderUser = ({ item }: { item: AdminUserItem }) => (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar uri={item.profilePhoto} size={40} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.displayName}</Text>
          <Text style={styles.username}>@{item.username} · {item.email}</Text>
        </View>
        <Badge
          label={item.status}
          color={item.status === 'ACTIVE' ? Colors.success : Colors.error}
        />
      </View>
      <View style={styles.meta}>
        {item.city && <Text style={styles.metaText}>📍 {item.city}</Text>}
        <Text style={styles.metaText}>{item.emailVerified ? '✅ Verified' : '❌ Unverified'}</Text>
      </View>
      <View style={styles.actions}>
        {item.status === 'ACTIVE' ? (
          <Button title="Suspend" onPress={() => handleSuspend(item)} variant="danger" small full={false} />
        ) : (
          <Button title="Reinstate" onPress={() => handleReinstate(item)} variant="outline" small full={false} />
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>👥 Manage Users</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} /> : error ? <ErrorView message={error} onRetry={fetchUsers} /> : <EmptyState emoji="👥" title="No users" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80, paddingTop: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, paddingHorizontal: 16, paddingTop: 10 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.text },
  username: { fontSize: 12, color: Colors.textSecondary },
  meta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
