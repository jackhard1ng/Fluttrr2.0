import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorView } from '@/components/ui/ErrorView';
import { useAuthStore } from '@/stores/auth.store';
import { adminApi, type AdminStatsResponse } from '@/api/admin';
import { extractErrorMessage } from '@/utils/error';

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const { data } = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => { fetchStats().finally(() => setLoading(false)); }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchStats(); setRefreshing(false);
  }, [fetchStats]);

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>🛡️ Admin Panel</Text>
      <Text style={s.sub}>Welcome, {user?.displayName}</Text>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
      }>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
        ) : error ? (
          <ErrorView message={error} onRetry={fetchStats} />
        ) : stats ? (
          <View style={s.grid}>
            <StatCard emoji="👥" label="Total Users" value={stats.totalUsers} />
            <StatCard emoji="🏪" label="Total Businesses" value={stats.totalBusinesses} />
            <StatCard emoji="⏳" label="Pending Businesses" value={stats.pendingBusinesses} color={Colors.warn} />
            <StatCard emoji="✅" label="Verified Businesses" value={stats.verifiedBusinesses} color={Colors.success} />
            <StatCard emoji="🎉" label="Total Events" value={stats.totalEvents} />
            <StatCard emoji="🟢" label="Active Events" value={stats.activeEvents} color={Colors.success} />
            <StatCard emoji="🚩" label="Total Reports" value={stats.totalReports} />
            <StatCard emoji="⚠️" label="Pending Reports" value={stats.pendingReports} color={Colors.error} />
          </View>
        ) : null}
        <Button title="Sign Out" onPress={logout} variant="danger" style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: number; color?: string }) {
  return (
    <Card style={s.statCard}>
      <Text style={s.statEmoji}>{emoji}</Text>
      <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  title: { fontSize: 22, fontWeight: '700', color: Colors.error, paddingHorizontal: 16, paddingTop: 10 },
  sub: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: 16, marginTop: 4 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', alignItems: 'center', paddingVertical: 16, flexGrow: 1 },
  statEmoji: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
});
