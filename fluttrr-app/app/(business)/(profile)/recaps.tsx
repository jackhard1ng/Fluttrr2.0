import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { recapsApi } from '@/api/recaps';
import { getEventEmoji, getEventColor } from '@/constants/categories';
import { formatEventDate } from '@/utils/date';
import { extractErrorMessage } from '@/utils/error';
import type { EventRecap } from '@/types/models';

export default function BusinessRecapsScreen() {
  const router = useRouter();
  const [recaps, setRecaps] = useState<EventRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchRecaps = useCallback(async () => {
    try {
      setError('');
      const { data } = await recapsApi.mine({ limit: 50 });
      setRecaps(data.recaps);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRecaps().finally(() => setLoading(false));
  }, [fetchRecaps]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecaps();
    setRefreshing(false);
  }, [fetchRecaps]);

  const handleDelete = (recap: EventRecap) => {
    Alert.alert('Delete Recap', 'Are you sure you want to delete this recap?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await recapsApi.delete(recap.id);
            setRecaps((prev) => prev.filter((r) => r.id !== recap.id));
          } catch (err) {
            Alert.alert('Error', extractErrorMessage(err));
          }
        },
      },
    ]);
  };

  const renderRecap = ({ item }: { item: EventRecap }) => {
    const emoji = item.event ? getEventEmoji(item.event.emoji, item.event.category) : '';
    const color = item.event ? getEventColor(item.event.color, item.event.category) : Colors.blue;

    return (
      <Card style={styles.recapCard}>
        <View style={styles.recapHeader}>
          <View style={[styles.recapIcon, { backgroundColor: color + '22' }]}>
            <Text style={{ fontSize: 18 }}>{emoji}</Text>
          </View>
          <View style={styles.recapHeaderInfo}>
            <Text style={styles.recapEventTitle} numberOfLines={1}>
              {item.event?.title || 'Event'}
            </Text>
            {item.event?.date && (
              <Text style={styles.recapDate}>{formatEventDate(item.event.date)}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {item.content && (
          <Text style={styles.recapContent}>{item.content}</Text>
        )}

        {item.photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosScroll}
          >
            {item.photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.photo} />
            ))}
          </ScrollView>
        )}

        <Text style={styles.recapTimestamp}>
          Posted {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Recaps</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={recaps}
        keyExtractor={(item) => item.id}
        renderItem={renderRecap}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
          ) : error ? (
            <ErrorView message={error} onRetry={fetchRecaps} />
          ) : (
            <EmptyState
              emoji="📸"
              title="No recaps yet"
              subtitle="Post recaps from your past events to show people your track record!"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: { width: 28, alignItems: 'flex-start' },
  backText: { fontSize: 28, color: Colors.blue, lineHeight: 28 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, textAlign: 'center', flex: 1 },
  recapCard: { marginBottom: 12 },
  recapHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  recapIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recapHeaderInfo: { flex: 1 },
  recapEventTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  recapDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: Colors.error + '20' },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: Colors.error },
  recapContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  photosScroll: { gap: 8, marginBottom: 8 },
  photo: { width: 120, height: 120, borderRadius: 10, backgroundColor: Colors.surface },
  recapTimestamp: { fontSize: 12, color: Colors.textMuted },
});
