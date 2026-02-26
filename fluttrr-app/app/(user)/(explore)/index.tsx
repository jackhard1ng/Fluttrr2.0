import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Chip } from '@/components/ui/Chip';
import { EventListCard } from '@/components/event/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { eventsApi, type EventListParams } from '@/api/events';
import { extractErrorMessage } from '@/utils/error';
import { CATEGORY_META, KC_NEIGHBORHOODS } from '@/constants/categories';
import { EventCategory } from '@/types/enums';
import { useLocation } from '@/hooks/useLocation';
import type { Event } from '@/types/models';

type EventWithMeta = Event & { attendeeCount: number; spotsLeft: number | null };

const CATEGORIES = [
  { key: null, label: 'All', emoji: '✨' },
  ...Object.entries(CATEGORY_META).map(([key, meta]) => ({
    key: key as EventCategory,
    label: meta.label,
    emoji: meta.emoji,
  })),
];

export default function ExploreScreen() {
  const router = useRouter();
  const { lat, lng, granted: locationGranted } = useLocation();

  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (pageNum = 1, append = false) => {
      const params: EventListParams = {
        page: pageNum,
        limit: 20,
        sort: locationGranted && !selectedArea ? 'distance' : 'date',
      };
      if (selectedCategory) params.category = selectedCategory;
      if (selectedArea) params.area = selectedArea;
      if (searchQuery.trim().length >= 2) params.search = searchQuery.trim();
      // Pass device location for distance-based sorting
      if (locationGranted && !selectedArea) {
        params.lat = lat;
        params.lng = lng;
        params.radius = 25;
      }

      try {
        setError(null);
        const { data } = await eventsApi.list(params);
        if (append) {
          setEvents((prev) => [...prev, ...data.events]);
        } else {
          setEvents(data.events);
        }
        setPage(pageNum);
        setTotalPages(data.totalPages);
      } catch (err) {
        if (!append) setError(extractErrorMessage(err));
      }
    },
    [selectedCategory, selectedArea, searchQuery, lat, lng, locationGranted],
  );

  useEffect(() => {
    setLoading(true);
    fetchEvents(1).finally(() => setLoading(false));
  }, [fetchEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents(1);
    setRefreshing(false);
  }, [fetchEvents]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await fetchEvents(page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, page, totalPages, fetchEvents]);

  const ListHeader = () => (
    <>
      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Explore</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor={Colors.textSecondary + '88'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.key || 'all'}
            label={cat.label}
            emoji={cat.emoji}
            selected={selectedCategory === cat.key}
            onPress={() =>
              setSelectedCategory(selectedCategory === cat.key ? null : cat.key)
            }
            color={
              cat.key ? CATEGORY_META[cat.key]?.color || Colors.blue : Colors.blue
            }
          />
        ))}
      </ScrollView>

      {/* Neighborhood filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {KC_NEIGHBORHOODS.map((nb) => (
          <Chip
            key={nb.label}
            label={nb.label}
            emoji={nb.emoji}
            selected={
              nb.label === 'All KC'
                ? selectedArea === null
                : selectedArea === nb.label
            }
            onPress={() =>
              setSelectedArea(nb.label === 'All KC' ? null : nb.label)
            }
          />
        ))}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventListCard event={item} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.blue} />
            </View>
          ) : error ? (
            <ErrorView message={error} onRetry={() => fetchEvents(1)} />
          ) : (
            <EmptyState
              emoji="🔍"
              title="No events found"
              subtitle={
                selectedCategory || selectedArea || searchQuery
                  ? 'Try adjusting your filters'
                  : 'Check back soon for events in Kansas City!'
              }
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color={Colors.blue}
              style={{ paddingVertical: 20 }}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
            progressBackgroundColor={Colors.surface}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 80,
  },
  centered: {
    padding: 40,
    alignItems: 'center',
  },
});
