import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MomentCard } from '@/components/moment/MomentCard';
import { momentsApi, type MomentWithCounts } from '@/api/moments';
import { extractErrorMessage } from '@/utils/error';

export default function MomentsScreen() {
  const router = useRouter();
  const [moments, setMoments] = useState<MomentWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Create moment inline
  const [composerOpen, setComposerOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchMoments = useCallback(async (p = 1) => {
    try {
      const { data } = await momentsApi.list({ page: p, limit: 20 });
      if (p === 1) {
        setMoments(data.moments);
      } else {
        setMoments((prev) => [...prev, ...data.moments]);
      }
      setHasMore(p < data.totalPages);
      setPage(p);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMoments(1).finally(() => setLoading(false));
  }, [fetchMoments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMoments(1);
    setRefreshing(false);
  }, [fetchMoments]);

  const loadMore = () => {
    if (hasMore && !loading) fetchMoments(page + 1);
  };

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    try {
      await momentsApi.create({ content: newContent.trim() });
      setNewContent('');
      setComposerOpen(false);
      fetchMoments(1);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = () => {
    fetchMoments(1);
  };

  const renderHeader = () => (
    <View>
      {/* Composer */}
      {composerOpen ? (
        <View style={s.composer}>
          <TextInput
            style={s.composerInput}
            placeholder="What's on your mind?"
            placeholderTextColor={Colors.textSecondary + '88'}
            value={newContent}
            onChangeText={setNewContent}
            multiline
            maxLength={2000}
            autoFocus
          />
          <View style={s.composerActions}>
            <Button
              title="Cancel"
              onPress={() => { setComposerOpen(false); setNewContent(''); }}
              variant="ghost"
              small
              full={false}
            />
            <Button
              title="Post"
              onPress={handlePost}
              loading={posting}
              disabled={!newContent.trim()}
              small
              full={false}
            />
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.composerTrigger} onPress={() => setComposerOpen(true)}>
          <Text style={s.composerPlaceholder}>Share a moment...</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Moments" showBack />

      <FlatList
        data={moments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MomentCard moment={item} onDelete={handleDelete} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              emoji="💭"
              title="No moments yet"
              subtitle="Be the first to share a moment!"
            />
          )
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  composerTrigger: {
    backgroundColor: Colors.card,
    borderRadius: Layout.radius.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  composerPlaceholder: { fontSize: 14, color: Colors.textSecondary },
  composer: {
    backgroundColor: Colors.card,
    borderRadius: Layout.radius.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.blue,
  },
  composerInput: {
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
