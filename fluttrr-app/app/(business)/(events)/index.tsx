import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { businessApi, type BusinessEventItem } from '@/api/business';
import { extractErrorMessage } from '@/utils/error';
import { getEventEmoji, getEventColor, CATEGORY_META } from '@/constants/categories';
import { formatEventDate, formatTimeRange } from '@/utils/date';
import { useAuthStore } from '@/stores/auth.store';
import type { EventCategory } from '@/types/enums';

type FilterType = 'all' | 'active' | 'past';

export default function BusinessEventsScreen() {
  const router = useRouter();
  const business = useAuthStore((s) => s.business);
  const [events, setEvents] = useState<BusinessEventItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      setError('');
      const { data } = await businessApi.getEvents({ filter, limit: 50 });
      setEvents(data.events);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchEvents().finally(() => setLoading(false));
  }, [fetchEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  const renderEvent = ({ item }: { item: BusinessEventItem }) => {
    const emoji = getEventEmoji(item.emoji, item.category);
    const color = getEventColor(item.color, item.category);
    const catMeta = CATEGORY_META[item.category as EventCategory];

    return (
      <Card
        onPress={() => router.push({ pathname: '/(shared)/event/[id]', params: { id: item.id } })}
        style={styles.eventCard}
      >
        <View style={styles.eventRow}>
          <View style={[styles.eventIcon, { backgroundColor: color + '22' }]}>
            <Text style={styles.eventEmoji}>{emoji}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.eventMeta}>
              {formatEventDate(item.date)} · {formatTimeRange(item.startTime, item.endTime)}
            </Text>
            <View style={styles.eventBadges}>
              <Badge label={catMeta?.label || item.category} color={color} />
              <Badge label={`${item.attendeeCount} going`} color={Colors.blue} />
              <Badge label={`${item.views} views`} color={Colors.textSecondary} />
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push({ pathname: '/(business)/(events)/[id]', params: { id: item.id } })}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Events</Text>
        {business?.verified ? (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/(business)/(events)/create')}
          >
            <Text style={styles.createBtnText}>+ New Event</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pendingChip}>
            <Text style={styles.pendingChipText}>Verification Pending</Text>
          </View>
        )}
      </View>

      <View style={styles.filterRow}>
        {(['all', 'active', 'past'] as FilterType[]).map((f) => (
          <Chip
            key={f}
            label={f.charAt(0).toUpperCase() + f.slice(1)}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
          ) : error ? (
            <ErrorView message={error} onRetry={fetchEvents} />
          ) : (
            <EmptyState
              emoji="🎉"
              title="No events yet"
              subtitle="Create your first event to start reaching customers!"
            />
          )
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  createBtn: { backgroundColor: Colors.blue, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  pendingChip: { backgroundColor: Colors.warn + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.warn + '40' },
  pendingChipText: { fontSize: 12, fontWeight: '600', color: Colors.warn },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginVertical: 10 },
  eventCard: { marginBottom: 10 },
  eventRow: { flexDirection: 'row', gap: 12 },
  eventIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventEmoji: { fontSize: 22 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  eventMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  eventBadges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  editBtn: { backgroundColor: Colors.blue + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'center' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: Colors.blue },
});
