import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ErrorView } from '@/components/ui/ErrorView';
import { useAuthStore } from '@/stores/auth.store';
import { businessApi, type BusinessStatsResponse } from '@/api/business';
import { extractErrorMessage } from '@/utils/error';

export default function BusinessDashboard() {
  const { business } = useAuthStore();
  const [stats, setStats] = useState<BusinessStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await businessApi.getStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Dashboard</Text>
        <Badge
          label={business?.verified ? 'Verified' : 'Pending'}
          color={business?.verified ? Colors.success : Colors.warn}
        />
      </View>
      <Text style={styles.bizName}>{business?.businessName}</Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
        ) : error ? (
          <ErrorView message={error} onRetry={fetchStats} />
        ) : stats ? (
          <>
            <View style={styles.statGrid}>
              <StatCard emoji="🎉" label="Total Events" value={stats.totalEvents} />
              <StatCard emoji="✅" label="Active Events" value={stats.activeEvents} color={Colors.success} />
              <StatCard emoji="👥" label="Total Attendees" value={stats.totalAttendees} />
              <StatCard emoji="👁️" label="Total Views" value={stats.totalViews} />
              <StatCard emoji="⭐" label="Avg Rating" value={stats.avgRating ? stats.avgRating.toFixed(1) : '—'} color={Colors.warn} />
              <StatCard emoji="📝" label="Reviews" value={stats.reviewCount} />
            </View>

            {!business?.verified && (
              <Card style={styles.pendingBanner}>
                <Text style={styles.pendingEmoji}>⏳</Text>
                <Text style={styles.pendingTitle}>Verification Pending</Text>
                <Text style={styles.pendingText}>
                  Your business is being reviewed. You'll be able to create events once verified.
                </Text>
              </Card>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: number | string; color?: string }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  bizName: { fontSize: 15, color: Colors.blue, paddingHorizontal: 16, marginTop: 4 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', alignItems: 'center', paddingVertical: 16, flexGrow: 1 },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  pendingBanner: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 20,
    borderColor: Colors.warn,
  },
  pendingEmoji: { fontSize: 32, marginBottom: 8 },
  pendingTitle: { fontSize: 16, fontWeight: '600', color: Colors.warn },
  pendingText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 20 },
});
