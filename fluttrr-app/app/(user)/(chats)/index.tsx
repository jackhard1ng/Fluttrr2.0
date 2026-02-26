import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorView } from '@/components/ui/ErrorView';
import { StatusDot } from '@/components/ui/Badge';
import { chatsApi, type ChatListItem } from '@/api/chats';
import { formatMessageTime } from '@/utils/date';
import { truncate } from '@/utils/format';
import { extractErrorMessage } from '@/utils/error';
import { ChatType } from '@/types/enums';

export default function ChatsListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      const { data } = await chatsApi.list();
      setChats(data.chats);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchChats().finally(() => setLoading(false));
  }, [fetchChats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  }, [fetchChats]);

  const getChatTitle = (chat: ChatListItem): string => {
    if (chat.type === ChatType.EVENT_GROUP && chat.event) {
      return `${chat.event.emoji || '🎉'} ${chat.event.title}`;
    }
    return 'Chat';
  };

  const getChatSubtitle = (chat: ChatListItem): string => {
    if (chat.type === ChatType.EVENT_GROUP) return 'Event Group Chat';
    if (chat.type === ChatType.BIZ_DM) return 'Business Chat';
    return 'Direct Message';
  };

  const renderChat = ({ item }: { item: ChatListItem }) => (
    <TouchableOpacity
      style={styles.chatItem}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/(user)/(chats)/[id]',
          params: { id: item.id, title: getChatTitle(item) },
        })
      }
    >
      {/* Chat avatar */}
      <View style={styles.chatAvatar}>
        <Text style={styles.chatAvatarEmoji}>
          {item.type === ChatType.EVENT_GROUP
            ? item.event?.emoji || '🎉'
            : '💬'}
        </Text>
      </View>

      {/* Chat info */}
      <View style={styles.chatInfo}>
        <View style={styles.chatTopRow}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {getChatTitle(item)}
          </Text>
          {item.lastMessage && (
            <Text style={styles.chatTime}>
              {formatMessageTime(item.lastMessage.createdAt)}
            </Text>
          )}
        </View>
        <View style={styles.chatBottomRow}>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.lastMessage
              ? truncate(item.lastMessage.content, 50)
              : getChatSubtitle(item)}
          </Text>
          {item.hasUnread && <StatusDot color={Colors.blue} />}
        </View>
        <Text style={styles.chatMembers}>
          {item.memberCount} member{item.memberCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
          ) : error ? (
            <ErrorView message={error} onRetry={fetchChats} />
          ) : (
            <EmptyState
              emoji="💬"
              title="No chats yet"
              subtitle="Join an event to start chatting with other attendees!"
            />
          )
        }
        contentContainerStyle={chats.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
            progressBackgroundColor={Colors.surface}
          />
        }
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatAvatarEmoji: {
    fontSize: 22,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  chatBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  chatPreview: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  chatMembers: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
