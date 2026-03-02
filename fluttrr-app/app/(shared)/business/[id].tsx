import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Share,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorView } from '@/components/ui/ErrorView';
import { businessPublicApi, type PublicBusinessResponse } from '@/api/business';
import { recapsApi } from '@/api/recaps';
import { getEventEmoji, getEventColor, CATEGORY_META } from '@/constants/categories';
import { formatEventDate, formatTimeRange } from '@/utils/date';
import { extractErrorMessage } from '@/utils/error';
import type { EventCategory } from '@/types/enums';
import type { EventRecap } from '@/types/models';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [biz, setBiz] = useState<PublicBusinessResponse | null>(null);
  const [recaps, setRecaps] = useState<EventRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [bizRes, recapsRes] = await Promise.all([
        businessPublicApi.getById(id),
        recapsApi.forBusiness(id, { limit: 10 }).catch(() => ({ data: { recaps: [] } })),
      ]);
      setBiz(bizRes.data);
      setRecaps(recapsRes.data.recaps);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
        </View>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !biz) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
        </View>
        <ErrorView message={error || 'Business not found'} onRetry={fetchBusiness} />
      </SafeAreaView>
    );
  }

  const starDisplay = biz.avgRating ? `${'★'.repeat(Math.round(biz.avgRating))}${'☆'.repeat(5 - Math.round(biz.avgRating))}` : null;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Business Profile</Text>
        <TouchableOpacity
          onPress={() => Share.share({ message: `Check out ${biz.businessName} on Fluttrr!` })}
          style={s.shareBtn}
        >
          <Text style={s.shareIcon}>↗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Hero */}
        <View style={s.heroSection}>
          <Avatar uri={biz.logo} size={80} />
          <Text style={s.bizName}>{biz.businessName}</Text>
          {biz.verified && (
            <Badge label="✓ Verified" color={Colors.success} />
          )}
          {biz.description && (
            <Text style={s.bizDescription}>{biz.description}</Text>
          )}
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statNumber}>{biz.events.length}</Text>
            <Text style={s.statLabel}>Events</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNumber}>{biz.reviewCount}</Text>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNumber}>{biz.avgRating?.toFixed(1) || '--'}</Text>
            <Text style={s.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={s.infoSection}>
          <Text style={s.sectionTitle}>Contact</Text>
          <InfoRow emoji="📍" value={biz.address} />
          {biz.phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${biz.phone}`)}>
              <InfoRow emoji="📞" value={biz.phone} tappable />
            </TouchableOpacity>
          )}
          {biz.website && (
            <TouchableOpacity onPress={() => Linking.openURL(biz.website!.startsWith('http') ? biz.website! : `https://${biz.website}`)}>
              <InfoRow emoji="🌐" value={biz.website} tappable />
            </TouchableOpacity>
          )}
          <InfoRow emoji="📅" value={`Member since ${new Date(biz.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`} />
        </View>

        {/* Upcoming Events */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Upcoming Events</Text>
          {biz.events.length > 0 ? (
            biz.events.map((event) => {
              const emoji = getEventEmoji(event.emoji, event.category);
              const color = getEventColor(event.color, event.category);
              const catMeta = CATEGORY_META[event.category as EventCategory];
              return (
                <Card
                  key={event.id}
                  style={s.eventCard}
                  onPress={() => router.push({ pathname: '/(shared)/event/[id]', params: { id: event.id } })}
                >
                  <View style={s.eventRow}>
                    <View style={[s.eventIcon, { backgroundColor: color + '22' }]}>
                      <Text style={s.eventEmoji}>{emoji}</Text>
                    </View>
                    <View style={s.eventInfo}>
                      <Text style={s.eventTitle} numberOfLines={1}>{event.title}</Text>
                      <Text style={s.eventMeta}>
                        {formatEventDate(event.date)} · {formatTimeRange(event.startTime, event.endTime)}
                      </Text>
                      <View style={s.eventBadges}>
                        <Badge label={catMeta?.label || event.category} color={color} />
                        <Badge label={`${event.attendeeCount} going`} color={Colors.blue} />
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <Text style={s.emptyText}>No upcoming events</Text>
          )}
        </View>

        {/* Event Recaps */}
        {recaps.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Past Event Recaps</Text>
            {recaps.map((recap) => {
              const recapEmoji = recap.event ? getEventEmoji(recap.event.emoji, recap.event.category) : '';
              const recapColor = recap.event ? getEventColor(recap.event.color, recap.event.category) : Colors.blue;
              return (
                <Card key={recap.id} style={s.recapCard}>
                  <View style={s.recapHeader}>
                    <View style={[s.recapIcon, { backgroundColor: recapColor + '22' }]}>
                      <Text style={{ fontSize: 16 }}>{recapEmoji}</Text>
                    </View>
                    <View style={s.recapHeaderInfo}>
                      <Text style={s.recapEventTitle} numberOfLines={1}>
                        {recap.event?.title || 'Event'}
                      </Text>
                      {recap.event?.date && (
                        <Text style={s.recapDate}>{formatEventDate(recap.event.date)}</Text>
                      )}
                    </View>
                  </View>
                  {recap.content && (
                    <Text style={s.recapContent}>{recap.content}</Text>
                  )}
                  {recap.photos.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.recapPhotosScroll}
                    >
                      {recap.photos.map((uri, i) => (
                        <Image key={i} source={{ uri }} style={s.recapPhoto} />
                      ))}
                    </ScrollView>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* Reviews */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Reviews {starDisplay && <Text style={s.starsText}>{starDisplay} ({biz.avgRating?.toFixed(1)})</Text>}
          </Text>
          {biz.reviews.length > 0 ? (
            biz.reviews.map((review) => (
              <View key={review.id} style={s.reviewCard}>
                <View style={s.reviewHeader}>
                  <Avatar uri={review.user.profilePhoto} size={32} />
                  <View style={s.reviewHeaderInfo}>
                    <Text style={s.reviewerName}>{review.user.displayName}</Text>
                    <Text style={s.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={s.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                </View>
                {review.content && <Text style={s.reviewContent}>{review.content}</Text>}
              </View>
            ))
          ) : (
            <Text style={s.emptyText}>No reviews yet</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ emoji, value, tappable }: { emoji: string; value: string; tappable?: boolean }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoEmoji}>{emoji}</Text>
      <Text style={[s.infoValue, tappable && { color: Colors.blue }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: { width: 28, alignItems: 'flex-start' },
  backText: { fontSize: 28, color: Colors.blue, lineHeight: 28 },
  shareBtn: { width: 28, alignItems: 'flex-end' },
  shareIcon: { fontSize: 20, color: Colors.blue },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  scroll: { paddingHorizontal: 16 },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  bizName: { fontSize: 24, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  bizDescription: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 4, paddingHorizontal: 16 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  // Info section
  infoSection: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  infoRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoEmoji: { fontSize: 16 },
  infoValue: { fontSize: 14, color: Colors.textSecondary, flex: 1 },

  // Events section
  section: { marginBottom: 16 },
  eventCard: { marginBottom: 8 },
  eventRow: { flexDirection: 'row', gap: 12 },
  eventIcon: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  eventEmoji: { fontSize: 20 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  eventMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  eventBadges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },

  // Recaps
  recapCard: { marginBottom: 10 },
  recapHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  recapIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  recapHeaderInfo: { flex: 1 },
  recapEventTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  recapDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  recapContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  recapPhotosScroll: { gap: 8 },
  recapPhoto: { width: 140, height: 140, borderRadius: 10, backgroundColor: Colors.surface },

  // Reviews
  starsText: { fontSize: 14, color: Colors.warn },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewHeaderInfo: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  reviewDate: { fontSize: 11, color: Colors.textSecondary },
  reviewStars: { fontSize: 14, color: Colors.warn },
  reviewContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginTop: 8 },
});
