import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { useAuthStore } from '@/stores/auth.store';
import { businessPublicApi } from '@/api/business';
import { extractErrorMessage } from '@/utils/error';

interface ReviewItem {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  user: { id: string; username: string; displayName: string; profilePhoto: string };
}

export default function BizReviewsScreen() {
  const { business } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchReviews = useCallback(async () => {
    if (!business?.id) return;
    try {
      setError('');
      const { data } = await businessPublicApi.getById(business.id);
      setReviews(data.reviews);
      setAvgRating(data.avgRating);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [business?.id]);

  useEffect(() => {
    fetchReviews().finally(() => setLoading(false));
  }, [fetchReviews]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  }, [fetchReviews]);

  const renderReview = ({ item }: { item: ReviewItem }) => (
    <View style={s.reviewCard}>
      <View style={s.reviewHeader}>
        <Avatar uri={item.user.profilePhoto} size={36} />
        <View style={s.reviewInfo}>
          <Text style={s.reviewerName}>{item.user.displayName}</Text>
          <Text style={s.reviewDate}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </View>
        <Text style={s.reviewStars}>
          {'⭐'.repeat(item.rating)}
        </Text>
      </View>
      {item.content && <Text style={s.reviewText}>{item.content}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Reviews" showBack />

      {/* Rating summary */}
      {avgRating !== null && (
        <View style={s.ratingCard}>
          <Text style={s.ratingNumber}>{avgRating.toFixed(1)}</Text>
          <Text style={s.ratingStars}>
            {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
          </Text>
          <Text style={s.ratingCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
          ) : error ? (
            <ErrorView message={error} onRetry={fetchReviews} />
          ) : (
            <EmptyState
              emoji="⭐"
              title="No reviews yet"
              subtitle="Reviews from attendees will appear here"
            />
          )
        }
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  ratingCard: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  ratingNumber: { fontSize: 36, fontWeight: '700', color: Colors.blue },
  ratingStars: { fontSize: 18, color: Colors.warn, marginTop: 4 },
  ratingCount: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewInfo: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  reviewDate: { fontSize: 11, color: Colors.textSecondary },
  reviewStars: { fontSize: 12 },
  reviewText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginTop: 8 },
});
