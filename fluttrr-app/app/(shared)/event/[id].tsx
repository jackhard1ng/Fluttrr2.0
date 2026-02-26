import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { eventsApi } from '@/api/events';
import type { EventDetailResponse } from '@/api/events';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { SpotsLabel } from '@/components/event/SpotsLabel';
import { ErrorView } from '@/components/ui/ErrorView';
import { getEventEmoji, getEventColor, CATEGORY_META } from '@/constants/categories';
import { formatEventDateFull, formatTimeRange } from '@/utils/date';
import { extractErrorMessage } from '@/utils/error';
import type { EventCategory } from '@/types/enums';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, accountType, user } = useAuthStore();

  const [event, setEvent] = useState<EventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isJoined = event?.attendees?.some((a) => a.id === user?.id) ?? false;
  const isUser = accountType === 'user';

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await eventsApi.getById(id);
      setEvent(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleJoin = async () => {
    if (!isAuthenticated || !isUser || !id) return;
    setJoining(true);
    try {
      const { data } = await eventsApi.join(id);
      Alert.alert('Joined!', 'You\'ve been added to the event group chat.', [{ text: 'OK' }]);
      fetchEvent(); // Refresh to show updated attendees
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    Alert.alert('Leave Event?', 'You\'ll be removed from the group chat.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setLeaving(true);
          try {
            await eventsApi.leave(id);
            fetchEvent();
          } catch (err) {
            Alert.alert('Error', extractErrorMessage(err));
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        </View>
        <ErrorView message={error || 'Event not found'} onRetry={fetchEvent} />
      </SafeAreaView>
    );
  }

  const emoji = getEventEmoji(event.emoji, event.category);
  const color = getEventColor(event.color, event.category);
  const catMeta = CATEGORY_META[event.category as EventCategory];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Event Details
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (!event?.title) return;
            Share.share({
              message: `Check out "${event.title}" on Fluttrr! fluttrr://event/${id}`,
              url: `https://fluttrr.com/event/${id}`,
            });
          }}
          style={styles.shareBtn}
        >
          <Text style={styles.shareIcon}>↗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero section */}
        <View style={[styles.heroSection, { backgroundColor: color + '15' }]}>
          <Text style={styles.heroEmoji}>{emoji}</Text>
          <View style={styles.heroBadges}>
            <Badge label={catMeta?.label || event.category} color={color} />
            {event.recurring && <Badge label="🔁 Recurring" color={Colors.purple} />}
          </View>
          <Text style={styles.heroTitle}>{event.title}</Text>
          <TouchableOpacity
            onPress={() => event.business?.id && router.push({ pathname: '/(shared)/business/[id]', params: { id: event.business.id } })}
          >
            <Text style={styles.heroVenue}>{event.business?.businessName}</Text>
          </TouchableOpacity>
        </View>

        {/* Info rows */}
        <View style={styles.infoSection}>
          <InfoRow emoji="📅" label="Date" value={formatEventDateFull(event.date)} />
          <InfoRow emoji="🕐" label="Time" value={formatTimeRange(event.startTime, event.endTime)} />
          <InfoRow emoji="📍" label="Location" value={event.area || event.business?.address || 'Kansas City'} />
          <InfoRow emoji="👥" label="Attendees" value={`${event.attendeeCount} going`}>
            <SpotsLabel spotsLeft={event.spotsLeft} size="md" />
          </InfoRow>
          <InfoRow emoji="👁️" label="Views" value={`${event.views}`} />
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>About</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        )}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <View style={styles.attendeesSection}>
            <Text style={styles.attendeesTitle}>
              People Going ({event.attendeeCount})
            </Text>
            <View style={styles.attendeesList}>
              {event.attendees.slice(0, 10).map((a) => (
                <View key={a.id} style={styles.attendeeItem}>
                  <Avatar uri={a.profilePhoto} size={36} />
                  <View>
                    <Text style={styles.attendeeName}>{a.displayName}</Text>
                    <Text style={styles.attendeeUsername}>@{a.username}</Text>
                  </View>
                </View>
              ))}
              {event.attendeeCount > 10 && (
                <Text style={styles.moreAttendees}>
                  +{event.attendeeCount - 10} more
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom action */}
      {isUser && (
        <View style={styles.bottomAction}>
          {isJoined ? (
            <View style={styles.joinedRow}>
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedText}>✅ You're going!</Text>
              </View>
              <Button
                title="Leave"
                onPress={handleLeave}
                variant="danger"
                small
                full={false}
                loading={leaving}
              />
            </View>
          ) : (
            <Button
              title="Join Event"
              onPress={handleJoin}
              loading={joining}
              disabled={event.spotsLeft !== null && event.spotsLeft <= 0}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({
  emoji,
  label,
  value,
  children,
}: {
  emoji: string;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.emoji}>{emoji}</Text>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <View style={infoStyles.valueRow}>
          <Text style={infoStyles.value}>{value}</Text>
          {children}
        </View>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emoji: {
    fontSize: 18,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 28,
    alignItems: 'flex-start',
  },
  backText: {
    fontSize: 28,
    color: Colors.blue,
    lineHeight: 28,
  },
  shareBtn: {
    width: 28,
    alignItems: 'flex-end',
  },
  shareIcon: {
    fontSize: 20,
    color: Colors.blue,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
  },
  // Hero
  heroSection: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  heroVenue: {
    fontSize: 15,
    color: Colors.blue,
    fontWeight: '600',
    marginTop: 4,
  },
  // Info
  infoSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  // Description
  descriptionSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // Attendees
  attendeesSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  attendeesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  attendeesList: {
    gap: 10,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  attendeeUsername: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  moreAttendees: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  // Bottom action
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    backgroundColor: Colors.dark,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinedText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
  },
});
