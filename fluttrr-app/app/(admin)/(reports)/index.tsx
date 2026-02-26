import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { adminApi, type AdminReportItem } from '@/api/admin';
import { extractErrorMessage } from '@/utils/error';
import { formatRelativeTime } from '@/utils/date';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warn,
  REVIEWED: Colors.blue,
  RESOLVED: Colors.success,
  DISMISSED: Colors.textMuted,
};

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [filter, setFilter] = useState<string>('PENDING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, string> = { limit: '50' };
      if (filter !== 'all') params.status = filter;
      const { data } = await adminApi.getReports(params);
      setReports(data.reports);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [filter]);

  useEffect(() => { setLoading(true); fetchReports().finally(() => setLoading(false)); }, [fetchReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchReports(); setRefreshing(false);
  }, [fetchReports]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await adminApi.updateReport(id, status);
      fetchReports();
    } catch (e) { Alert.alert('Error', extractErrorMessage(e)); }
  };

  const renderReport = ({ item }: { item: AdminReportItem }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Badge label={item.reportType} color={Colors.textSecondary} />
        <Badge label={item.status} color={STATUS_COLORS[item.status] || Colors.textMuted} />
      </View>
      <Text style={styles.reason}>{item.reason}</Text>
      {item.details && <Text style={styles.details}>{item.details}</Text>}
      <Text style={styles.reporter}>
        Reported by @{item.reportedBy.username} · {formatRelativeTime(item.createdAt)}
      </Text>
      {item.status === 'PENDING' && (
        <View style={styles.actions}>
          <Button title="Reviewed" onPress={() => updateStatus(item.id, 'REVIEWED')} variant="secondary" small full={false} />
          <Button title="Resolve" onPress={() => updateStatus(item.id, 'RESOLVED')} small full={false} />
          <Button title="Dismiss" onPress={() => updateStatus(item.id, 'DISMISSED')} variant="ghost" small full={false} />
        </View>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🚩 Reports</Text>
      <View style={styles.filters}>
        {['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED', 'all'].map((f) => (
          <Chip key={f} label={f === 'all' ? 'All' : f} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} /> : error ? <ErrorView message={error} onRetry={fetchReports} /> : <EmptyState emoji="🚩" title="No reports" subtitle="Clean slate!" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, paddingHorizontal: 16, paddingTop: 10 },
  filters: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginVertical: 10, flexWrap: 'wrap' },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reason: { fontSize: 14, fontWeight: '500', color: Colors.text },
  details: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  reporter: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
});
