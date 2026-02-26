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
import { adminApi, type AdminBusinessItem } from '@/api/admin';
import { extractErrorMessage } from '@/utils/error';

type FilterKey = 'all' | 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export default function AdminBusinessesScreen() {
  const [businesses, setBusinesses] = useState<AdminBusinessItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      const { data } = await adminApi.getBusinesses({ ...params, limit: 50 });
      setBusinesses(data.businesses);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [filter]);

  useEffect(() => { setLoading(true); fetchBusinesses().finally(() => setLoading(false)); }, [fetchBusinesses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchBusinesses(); setRefreshing(false);
  }, [fetchBusinesses]);

  const handleAction = async (biz: AdminBusinessItem, action: 'verify' | 'unverify' | 'suspend' | 'reinstate') => {
    try {
      if (action === 'verify') await adminApi.verifyBusiness(biz.id);
      else if (action === 'unverify') await adminApi.unverifyBusiness(biz.id);
      else if (action === 'suspend') await adminApi.suspendBusiness(biz.id);
      else if (action === 'reinstate') await adminApi.reinstateBusiness(biz.id);
      Alert.alert('Done', `Business ${action}d.`);
      fetchBusinesses();
    } catch (err) { Alert.alert('Error', extractErrorMessage(err)); }
  };

  const renderBiz = ({ item }: { item: AdminBusinessItem }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.bizName}>{item.businessName}</Text>
        <Badge
          label={item.verified ? 'Verified' : item.status}
          color={item.verified ? Colors.success : item.status === 'SUSPENDED' ? Colors.error : Colors.warn}
        />
      </View>
      <Text style={styles.bizEmail}>{item.email}</Text>
      <Text style={styles.bizAddress}>📍 {item.address}</Text>
      <Text style={styles.bizEvents}>{item.eventCount} events</Text>
      <View style={styles.actions}>
        {!item.verified && item.status !== 'SUSPENDED' && (
          <Button title="✅ Verify" onPress={() => handleAction(item, 'verify')} small full={false} />
        )}
        {item.verified && (
          <Button title="Unverify" onPress={() => handleAction(item, 'unverify')} variant="secondary" small full={false} />
        )}
        {item.status !== 'SUSPENDED' ? (
          <Button title="Suspend" onPress={() => handleAction(item, 'suspend')} variant="danger" small full={false} />
        ) : (
          <Button title="Reinstate" onPress={() => handleAction(item, 'reinstate')} variant="outline" small full={false} />
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🏪 Manage Businesses</Text>
      <View style={styles.filters}>
        {(['all', 'PENDING', 'ACTIVE', 'SUSPENDED'] as FilterKey[]).map((f) => (
          <Chip key={f} label={f === 'all' ? 'All' : f} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>
      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id}
        renderItem={renderBiz}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} /> : error ? <ErrorView message={error} onRetry={fetchBusinesses} /> : <EmptyState emoji="🏪" title="No businesses" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, paddingHorizontal: 16, paddingTop: 10 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginVertical: 10 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bizName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  bizEmail: { fontSize: 12, color: Colors.textSecondary },
  bizAddress: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  bizEvents: { fontSize: 12, color: Colors.blue, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
});
