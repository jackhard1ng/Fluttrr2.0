import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { usersApi } from '@/api/users';
import type { Notification } from '@/types/models';
import { formatRelativeTime } from '@/utils/date';
import { extractErrorMessage } from '@/utils/error';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const { data } = await usersApi.getNotifications();
      setNotifications(data.notifications);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetch().finally(() => setLoading(false));
    // Mark all as read on enter
    usersApi.markAllNotificationsRead().catch(() => {});
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Notifications" showBack />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.item, !item.read && styles.itemUnread]}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemBody}>{item.body}</Text>
            <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
          ) : error ? (
            <ErrorView message={error} onRetry={fetch} />
          ) : (
            <EmptyState
              emoji="🔔"
              title="No notifications"
              subtitle="You're all caught up!"
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemUnread: {
    backgroundColor: Colors.blue + '08',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  itemBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  itemTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
