import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
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
  { key: null, label: 'All Types' },
  ...Object.entries(CATEGORY_META).map(([key, meta]) => ({
    key: key as EventCategory,
    label: meta.label,
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

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);

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

  const selectedCategoryLabel =
    CATEGORIES.find((c) => c.key === selectedCategory)?.label || 'All Types';
  const selectedAreaLabel = selectedArea || 'All KC';

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

      {/* Dropdown filters row */}
      <View style={styles.dropdownRow}>
        <TouchableOpacity
          style={[styles.dropdown, selectedCategory && styles.dropdownActive]}
          onPress={() => setShowCategoryDropdown(true)}
        >
          <Text
            style={[styles.dropdownText, selectedCategory && styles.dropdownTextActive]}
            numberOfLines={1}
          >
            {selectedCategoryLabel}
          </Text>
          <Text style={styles.dropdownArrow}>▾</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dropdown, selectedArea && styles.dropdownActive]}
          onPress={() => setShowAreaDropdown(true)}
        >
          <Text
            style={[styles.dropdownText, selectedArea && styles.dropdownTextActive]}
            numberOfLines={1}
          >
            {selectedAreaLabel}
          </Text>
          <Text style={styles.dropdownArrow}>▾</Text>
        </TouchableOpacity>
      </View>
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

      {/* Category dropdown modal */}
      <Modal visible={showCategoryDropdown} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryDropdown(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Event Type</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key || 'all'}
                style={[
                  styles.modalOption,
                  selectedCategory === cat.key && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSelectedCategory(cat.key);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedCategory === cat.key && styles.modalOptionTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
                {selectedCategory === cat.key && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Area dropdown modal */}
      <Modal visible={showAreaDropdown} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAreaDropdown(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Neighborhood</Text>
            {KC_NEIGHBORHOODS.map((nb) => {
              const isSelected =
                nb.label === 'All KC' ? selectedArea === null : selectedArea === nb.label;
              return (
                <TouchableOpacity
                  key={nb.label}
                  style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedArea(nb.label === 'All KC' ? null : nb.label);
                    setShowAreaDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      isSelected && styles.modalOptionTextActive,
                    ]}
                  >
                    {nb.label}
                  </Text>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
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
  dropdownRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownActive: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blue + '15',
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    flex: 1,
  },
  dropdownTextActive: {
    color: Colors.blue,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  listContent: {
    paddingBottom: 80,
  },
  centered: {
    padding: 40,
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalOptionActive: {
    backgroundColor: Colors.blue + '15',
  },
  modalOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  modalOptionTextActive: {
    color: Colors.blue,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: Colors.blue,
    fontWeight: '700',
  },
});
