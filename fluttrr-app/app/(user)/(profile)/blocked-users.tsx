import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
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
import { usersApi } from '@/api/users';
import { extractErrorMessage } from '@/utils/error';

interface BlockedUserItem {
  id: string;
  displayName: string;
  username: string;
  profilePhoto: string | null;
  blockedAt: string;
}

export default function BlockedUsersScreen() {
  const [users, setUsers] = useState<BlockedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const fetchBlocked = useCallback(async () => {
    try {
      setError('');
      const { data } = await usersApi.getBlockedUsers();
      setUsers(data.users);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchBlocked().finally(() => setLoading(false));
  }, [fetchBlocked]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBlocked();
    setRefreshing(false);
  }, [fetchBlocked]);

  const handleUnblock = (user: BlockedUserItem) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblocking(user.id);
            try {
              await usersApi.unblockUser(user.id);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
            } catch (err) {
              Alert.alert('Error', extractErrorMessage(err));
            } finally {
              setUnblocking(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: BlockedUserItem }) => (
    <View style={s.row}>
      <Avatar uri={item.profilePhoto} size={44} />
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
        <Text style={s.username}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={s.unblockBtn}
        onPress={() => handleUnblock(item)}
        disabled={unblocking === item.id}
      >
        {unblocking === item.id ? (
          <ActivityIndicator size="small" color={Colors.error} />
        ) : (
          <Text style={s.unblockText}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Blocked Users" showBack />

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
          ) : error ? (
            <ErrorView message={error} onRetry={fetchBlocked} />
          ) : (
            <EmptyState
              emoji="✌️"
              title="No blocked users"
              subtitle="You haven't blocked anyone"
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  info: { flex: 1 },
  name: { fontSize: Layout.fontSize.md, fontWeight: Layout.fontWeight.semibold as '600', color: Colors.text },
  username: { fontSize: Layout.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  unblockBtn: {
    backgroundColor: Colors.error + '18',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Layout.radius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  unblockText: { fontSize: Layout.fontSize.sm, fontWeight: Layout.fontWeight.semibold as '600', color: Colors.error },
});
