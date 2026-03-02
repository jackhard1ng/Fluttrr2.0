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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { eventsApi } from '@/api/events';
import { usersApi } from '@/api/users';
import type { Event } from '@/types/models';
import { FeaturedEventCard, EventListCard } from '@/components/event/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { StatusDot } from '@/components/ui/Badge';
import { FluttrLogo } from '@/components/ui/FluttrLogo';
import { extractErrorMessage } from '@/utils/error';

type EventWithMeta = Event & { attendeeCount: number; spotsLeft: number | null };

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [featured, setFeatured] = useState<EventWithMeta[]>([]);
  const [nearYou, setNearYou] = useState<EventWithMeta[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchFeatured = useCallback(async () => {
    try {
      const { data } = await eventsApi.featured();
      setFeatured(data.events);
    } catch (err) {
      // Featured is non-critical; silently degrade
    }
  }, []);

  const fetchNearYou = useCallback(async (pageNum = 1, append = false) => {
    try {
      const { data } = await eventsApi.list({ page: pageNum, limit: 20, sort: 'date' });
      if (append) {
        setNearYou((prev) => [...prev, ...data.events]);
      } else {
        setNearYou(data.events);
      }
      setPage(pageNum);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      if (!append) setError(extractErrorMessage(err));
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await usersApi.getNotifications({ page: 1 });
      setUnreadCount(data.unreadCount);
    } catch {}
  }, []);

  const loadInitial = useCallback(async () => {
    setInitialLoading(true);
    await Promise.all([fetchFeatured(), fetchNearYou(1), fetchUnreadCount()]);
    setInitialLoading(false);
  }, [fetchFeatured, fetchNearYou, fetchUnreadCount]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchFeatured(), fetchNearYou(1), fetchUnreadCount()]);
    setRefreshing(false);
  }, [fetchFeatured, fetchNearYou, fetchUnreadCount]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await fetchNearYou(page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, page, totalPages, fetchNearYou]);

  // Header component for the FlatList
  const ListHeader = () => (
    <>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <FluttrLogo size={28} />
          <Text style={styles.logo}>fluttrr</Text>
        </View>
        <View style={styles.headerRight}>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push('/(admin)/(dashboard)')}
              style={styles.adminButton}
            >
              <Text style={styles.adminButtonText}>Admin</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push('/(user)/(home)/moments')}
            style={styles.bellButton}
          >
            <Text style={styles.bell}>💭</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(user)/(home)/notifications')}
            style={styles.bellButton}
          >
            <Text style={styles.bell}>🔔</Text>
            {unreadCount > 0 && <StatusDot style={styles.bellDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured section */}
      {featured.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured This Week</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {featured.map((event) => (
              <FeaturedEventCard key={event.id} event={event} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Near You heading */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Near You</Text>
      </View>
    </>
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <FluttrLogo size={28} />
            <Text style={styles.logo}>fluttrr</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={nearYou}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventListCard event={item} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          error ? (
            <ErrorView message={error} onRetry={loadInitial} />
          ) : (
            <EmptyState
              emoji="🎉"
              title="No events yet"
              subtitle="Check back soon for events in Kansas City!"
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: Colors.blue + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.blue + '40',
  },
  adminButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.blue,
  },
  bellButton: {
    position: 'relative',
    padding: 4,
  },
  bell: {
    fontSize: 20,
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 80,
  },
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  featuredScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
});
