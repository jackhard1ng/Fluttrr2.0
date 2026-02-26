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
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { EventListCard } from '@/components/event/EventCard';
import { usersApi } from '@/api/users';
import { extractErrorMessage } from '@/utils/error';
import type { Event } from '@/types/models';

type EventWithMeta = Event & { attendeeCount: number; spotsLeft?: number | null; joinedAt: string };

export default function MyEventsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (type: 'upcoming' | 'past') => {
    try {
      const { data } = await usersApi.getMyEvents({ type });
      setEvents(data.events || []);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchEvents(tab).finally(() => setLoading(false));
  }, [tab, fetchEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents(tab);
    setRefreshing(false);
  }, [tab, fetchEvents]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="My Events" showBack />

      {/* Tab selector */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.activeTab]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.activeTab]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventListCard event={{ ...item, spotsLeft: item.spotsLeft ?? null }} />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
          ) : error ? (
            <ErrorView message={error} onRetry={() => fetchEvents(tab)} />
          ) : (
            <EmptyState
              emoji={tab === 'upcoming' ? '🎉' : '📅'}
              title={tab === 'upcoming' ? 'No upcoming events' : 'No past events'}
              subtitle={
                tab === 'upcoming'
                  ? 'Browse events on the home screen and join one!'
                  : 'Events you\'ve attended will show up here.'
              }
            />
          )
        }
        contentContainerStyle={events.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
            progressBackgroundColor={Colors.surface}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.textWhite,
  },
});
