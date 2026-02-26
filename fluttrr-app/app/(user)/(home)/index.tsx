import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { eventsApi } from '@/api/events';
import type { EventListResponse, FeaturedResponse } from '@/api/events';
import type { Event } from '@/types/models';
import { FeaturedEventCard, EventListCard } from '@/components/event/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { StatusDot } from '@/components/ui/Badge';
import { extractErrorMessage } from '@/utils/error';

type EventWithMeta = Event & { attendeeCount: number; spotsLeft: number | null };

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [featured, setFeatured] = useState<EventWithMeta[]>([]);
  const [nearYou, setNearYou] = useState<EventWithMeta[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin long-press (5-second hold on logo) + passcode
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  const startAdminPress = () => {
    if (!isAdmin) return;
    pressTimer.current = setTimeout(() => {
      setAdminPin('');
      setShowAdminPin(true);
    }, 5000);
  };
  const endAdminPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleAdminPinSubmit = () => {
    if (adminPin === '2417') {
      setShowAdminPin(false);
      setAdminPin('');
      router.push('/(admin)/(dashboard)');
    } else {
      Alert.alert('Incorrect', 'Wrong passcode.');
      setAdminPin('');
    }
  };

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

  const loadInitial = useCallback(async () => {
    setInitialLoading(true);
    await Promise.all([fetchFeatured(), fetchNearYou(1)]);
    setInitialLoading(false);
  }, [fetchFeatured, fetchNearYou]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchFeatured(), fetchNearYou(1)]);
    setRefreshing(false);
  }, [fetchFeatured, fetchNearYou]);

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
        <TouchableOpacity
          onPressIn={startAdminPress}
          onPressOut={endAdminPress}
          activeOpacity={1}
        >
          <Text style={styles.logo}>🦋 fluttrr</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
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
            <StatusDot style={styles.bellDot} />
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
          <Text style={styles.logo}>🦋 fluttrr</Text>
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

      {/* Admin PIN modal */}
      <Modal visible={showAdminPin} transparent animationType="fade">
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>🔒 Admin Access</Text>
            <Text style={styles.pinSubtitle}>Enter the 4-digit passcode</Text>
            <TextInput
              style={styles.pinInput}
              value={adminPin}
              onChangeText={(t) => setAdminPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              placeholder="••••"
              placeholderTextColor={Colors.textSecondary + '66'}
            />
            <View style={styles.pinActions}>
              <TouchableOpacity
                onPress={() => { setShowAdminPin(false); setAdminPin(''); }}
                style={styles.pinCancelBtn}
              >
                <Text style={styles.pinCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdminPinSubmit}
                style={[styles.pinSubmitBtn, adminPin.length < 4 && { opacity: 0.5 }]}
                disabled={adminPin.length < 4}
              >
                <Text style={styles.pinSubmitText}>Enter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Admin PIN modal
  pinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pinTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  pinSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 20 },
  pinInput: {
    width: '100%',
    backgroundColor: Colors.dark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: 20,
  },
  pinActions: { flexDirection: 'row', gap: 12, width: '100%' },
  pinCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.dark,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pinCancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  pinSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.blue,
    alignItems: 'center',
  },
  pinSubmitText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
