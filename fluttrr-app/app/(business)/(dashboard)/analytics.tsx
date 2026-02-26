import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ErrorView } from '@/components/ui/ErrorView';
import { businessApi } from '@/api/business';
import { extractErrorMessage } from '@/utils/error';

interface AnalyticsData {
  period: number;
  dailyJoins: { date: string; count: number }[];
  topEvents: { id: string; title: string; views: number; date: string }[];
  categoryBreakdown: { category: string; count: number }[];
  recentReviews: { id: string; rating: number; content: string | null; user: { displayName: string }; createdAt: string }[];
  eventsThisMonth: number;
  subscriptionTier: string;
}

export default function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data: analytics } = await businessApi.getAnalytics(30);
      setData(analytics);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchAnalytics().finally(() => setLoading(false));
  }, [fetchAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }, [fetchAnalytics]);

  const tierColor = data?.subscriptionTier === 'PRO' ? Colors.blue : data?.subscriptionTier === 'GROWTH' ? Colors.success : Colors.textMuted;
  const tierLabel = data?.subscriptionTier || 'FREE';

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Analytics" showBack />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
        ) : error ? (
          <ErrorView message={error} onRetry={fetchAnalytics} />
        ) : data ? (
          <>
            {/* Subscription + Usage */}
            <Card style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Plan & Usage</Text>
                <Badge label={tierLabel} color={tierColor} />
              </View>
              <Text style={s.usageText}>
                Events this month: <Text style={s.usageValue}>{data.eventsThisMonth}</Text>
                {tierLabel === 'FREE' && <Text style={s.usageLimit}> / 5</Text>}
              </Text>
            </Card>

            {/* Attendee Trend */}
            <Card style={s.section}>
              <Text style={s.sectionTitle}>Attendees (Last 30 Days)</Text>
              {data.dailyJoins.length > 0 ? (
                <View style={s.barChart}>
                  {data.dailyJoins.slice(-14).map((day, i) => {
                    const maxCount = Math.max(...data.dailyJoins.map((d) => d.count), 1);
                    const height = Math.max(4, (day.count / maxCount) * 60);
                    return (
                      <View key={i} style={s.barCol}>
                        <View style={[s.bar, { height, backgroundColor: Colors.blue }]} />
                        <Text style={s.barLabel}>{day.count}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={s.emptyText}>No attendees yet this period</Text>
              )}
            </Card>

            {/* Top Events by Views */}
            <Card style={s.section}>
              <Text style={s.sectionTitle}>Top Events by Views</Text>
              {data.topEvents.length > 0 ? (
                data.topEvents.slice(0, 5).map((event, i) => (
                  <View key={event.id} style={s.listRow}>
                    <Text style={s.listRank}>{i + 1}.</Text>
                    <Text style={s.listTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={s.listValue}>{event.views} views</Text>
                  </View>
                ))
              ) : (
                <Text style={s.emptyText}>No events yet</Text>
              )}
            </Card>

            {/* Category Breakdown */}
            <Card style={s.section}>
              <Text style={s.sectionTitle}>Event Categories</Text>
              {data.categoryBreakdown.length > 0 ? (
                data.categoryBreakdown.map((cat) => (
                  <View key={cat.category} style={s.listRow}>
                    <Text style={s.listTitle}>{cat.category.replace('_', ' ')}</Text>
                    <Text style={s.listValue}>{cat.count}</Text>
                  </View>
                ))
              ) : (
                <Text style={s.emptyText}>No events yet</Text>
              )}
            </Card>

            {/* Recent Reviews */}
            <Card style={s.section}>
              <Text style={s.sectionTitle}>Recent Reviews</Text>
              {data.recentReviews.length > 0 ? (
                data.recentReviews.map((review) => (
                  <View key={review.id} style={s.reviewRow}>
                    <View style={s.reviewHeader}>
                      <Text style={s.reviewAuthor}>{review.user.displayName}</Text>
                      <Text style={s.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                    </View>
                    {review.content && (
                      <Text style={s.reviewContent} numberOfLines={2}>{review.content}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={s.emptyText}>No recent reviews</Text>
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { marginBottom: 12, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  usageText: { fontSize: 14, color: Colors.textSecondary },
  usageValue: { fontWeight: '700', color: Colors.text },
  usageLimit: { color: Colors.textMuted },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', borderRadius: 3, minWidth: 8 },
  barLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 4 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  listRank: { fontSize: 13, color: Colors.textMuted, width: 20 },
  listTitle: { fontSize: 14, color: Colors.text, flex: 1 },
  listValue: { fontSize: 13, color: Colors.blue, fontWeight: '600' },
  reviewRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: Colors.text },
  reviewStars: { fontSize: 12, color: Colors.warn },
  reviewContent: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  emptyText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
});
