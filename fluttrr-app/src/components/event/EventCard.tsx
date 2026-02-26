import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Badge } from '@/components/ui/Badge';
import { AvatarGroup } from '@/components/ui/Avatar';
import { SpotsLabel } from './SpotsLabel';
import { getEventEmoji, getEventColor, CATEGORY_META } from '@/constants/categories';
import { formatEventDate, formatTimeRange } from '@/utils/date';
import type { Event } from '@/types/models';
import type { EventCategory } from '@/types/enums';

interface EventCardProps {
  event: Event & { attendeeCount: number; spotsLeft: number | null };
}

// Featured card (horizontal scrollable, gradient bg) — matches prototype exactly
export function FeaturedEventCard({ event }: EventCardProps) {
  const router = useRouter();
  const emoji = getEventEmoji(event.emoji, event.category);
  const color = getEventColor(event.color, event.category);
  const catMeta = CATEGORY_META[event.category as EventCategory];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(shared)/event/[id]', params: { id: event.id } })}
      style={[styles.featuredCard, { borderColor: color + '44' }]}
    >
      {/* Gradient overlay using color */}
      <View style={[styles.featuredGradient, { backgroundColor: color + '18' }]} />

      {/* Category + Recurring badges */}
      <View style={styles.badgeRow}>
        <Badge label={catMeta?.label || event.category} color={color} />
        {event.recurring && <Badge label="🔁" color={Colors.purple} />}
      </View>

      {/* Event emoji */}
      <Text style={styles.featuredEmoji}>{emoji}</Text>

      {/* Title */}
      <Text style={styles.featuredTitle} numberOfLines={2}>
        {event.title}
      </Text>

      {/* Venue */}
      <Text style={styles.featuredVenue} numberOfLines={1}>
        {event.business?.businessName}
      </Text>

      {/* Location + Date */}
      <Text style={styles.featuredMeta} numberOfLines={1}>
        📍 {event.area || 'Kansas City'} · {formatEventDate(event.date)}
      </Text>

      {/* Time */}
      <Text style={styles.featuredMeta}>
        {formatTimeRange(event.startTime, event.endTime)}
      </Text>

      {/* Footer: attendees + spots */}
      <View style={styles.featuredFooter}>
        <AvatarGroup
          items={Array.from({ length: Math.min(event.attendeeCount, 4) }, () => ({}))}
          max={3}
          size={22}
          extraCount={Math.max(0, event.attendeeCount - 3)}
        />
        <SpotsLabel spotsLeft={event.spotsLeft} />
      </View>
    </TouchableOpacity>
  );
}

// List card (full-width, horizontal layout) — matches prototype "Near You" exactly
export function EventListCard({ event }: EventCardProps) {
  const router = useRouter();
  const emoji = getEventEmoji(event.emoji, event.category);
  const color = getEventColor(event.color, event.category);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/(shared)/event/[id]', params: { id: event.id } })}
      style={styles.listCard}
    >
      {/* Event icon */}
      <View style={[styles.listIcon, { backgroundColor: color + '22' }]}>
        <Text style={styles.listIconEmoji}>{emoji}</Text>
      </View>

      {/* Info */}
      <View style={styles.listInfo}>
        {/* Title + recurring */}
        <View style={styles.titleRow}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {event.title}
          </Text>
          {event.recurring && (
            <Text style={styles.recurringIcon}>🔁</Text>
          )}
        </View>

        {/* Venue + area */}
        <Text style={styles.listVenue} numberOfLines={1}>
          {event.business?.businessName} · {event.area || 'KC'}
        </Text>

        {/* Date + time */}
        <Text style={styles.listMeta} numberOfLines={1}>
          {formatEventDate(event.date)} · {formatTimeRange(event.startTime, event.endTime)}
        </Text>

        {/* Attendees + spots */}
        <View style={styles.listFooter}>
          <AvatarGroup
            items={Array.from({ length: Math.min(event.attendeeCount, 4) }, () => ({}))}
            max={3}
            size={20}
            extraCount={Math.max(0, event.attendeeCount - 3)}
          />
          <SpotsLabel spotsLeft={event.spotsLeft} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Featured Card ──────────────────────────
  featuredCard: {
    minWidth: 240,
    width: 240,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  featuredEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  featuredVenue: {
    fontSize: 13,
    color: Colors.blue,
    marginTop: 2,
  },
  featuredMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  // ── List Card ──────────────────────────────
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    gap: 12,
  },
  listIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIconEmoji: {
    fontSize: 26,
  },
  listInfo: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
  },
  recurringIcon: {
    fontSize: 10,
    color: Colors.purple,
  },
  listVenue: {
    fontSize: 12,
    color: Colors.blue,
  },
  listMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
