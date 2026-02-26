import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorView } from '@/components/ui/ErrorView';
import { momentsApi, type MomentDetailResponse } from '@/api/moments';
import { useAuthStore } from '@/stores/auth.store';
import { extractErrorMessage } from '@/utils/error';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BG_COLORS = ['#7C3AED', '#DC2626', '#F97316', '#10B981', '#2563EB', '#EC4899'];

export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [moment, setMoment] = useState<MomentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const fetchMoment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await momentsApi.getById(id);
      setMoment(data);
      setLikeCount(data.likeCount);
      // Check if user liked
      try {
        const { data: likeData } = await momentsApi.checkLiked(id);
        setLiked(likeData.liked);
      } catch {}
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMoment();
  }, [fetchMoment]);

  const handleLike = async () => {
    if (!id) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      if (wasLiked) {
        await momentsApi.unlike(id);
      } else {
        await momentsApi.like(id);
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
    }
  };

  const handleComment = async () => {
    if (!id || !commentText.trim()) return;
    setCommenting(true);
    try {
      await momentsApi.comment(id, commentText.trim());
      setCommentText('');
      fetchMoment();
    } catch {
      // Comment failed silently - user can retry
    }
    setCommenting(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !moment) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ErrorView message={error || 'Moment not found'} onRetry={fetchMoment} />
      </SafeAreaView>
    );
  }

  const bgColor = BG_COLORS[(moment.content?.length || 0) % BG_COLORS.length];
  const timeAgo = getTimeAgo(moment.createdAt);

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerUser}>
            <Avatar uri={moment.user?.profilePhoto} size={34} ring={Colors.blue} />
            <View>
              <Text style={s.headerName}>{moment.user?.displayName}</Text>
              <Text style={s.headerTime}>{timeAgo}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content area */}
        <View style={[s.contentArea, { backgroundColor: bgColor + '25' }]}>
          <Text style={s.contentText}>{moment.content}</Text>
        </View>

        {/* Like + comment counts */}
        <View style={s.statsRow}>
          <TouchableOpacity style={s.statBtn} onPress={handleLike}>
            <Text style={s.statEmoji}>{liked ? '❤️' : '🤍'}</Text>
            <Text style={s.statCount}>{likeCount}</Text>
          </TouchableOpacity>
          <View style={s.statBtn}>
            <Text style={s.statEmoji}>💬</Text>
            <Text style={s.statCount}>{moment.commentCount}</Text>
          </View>
        </View>

        {/* Comments */}
        <FlatList
          data={moment.comments || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={s.commentRow}>
              <Avatar uri={item.user?.profilePhoto} size={28} />
              <View style={s.commentContent}>
                <Text style={s.commentAuthor}>{item.user?.displayName}</Text>
                <Text style={s.commentBody}>{item.content}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={s.commentsList}
          ListEmptyComponent={
            <Text style={s.noComments}>No comments yet</Text>
          }
        />

        {/* Comment input */}
        <View style={s.commentInputRow}>
          <TextInput
            style={s.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleComment}
          />
          <TouchableOpacity
            onPress={handleComment}
            disabled={!commentText.trim() || commenting}
            style={s.sendBtn}
          >
            <Text style={[s.sendText, (!commentText.trim() || commenting) && { opacity: 0.4 }]}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  headerTime: { fontSize: 12, color: Colors.textSecondary },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: Colors.textSecondary },
  contentArea: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 32,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentText: { fontSize: 18, fontWeight: '600', color: Colors.text, textAlign: 'center', lineHeight: 28 },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  statBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statEmoji: { fontSize: 18 },
  statCount: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  commentsList: { paddingHorizontal: 16, paddingBottom: 10 },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  commentContent: { flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: Colors.text },
  commentBody: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  noComments: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  sendBtn: { paddingHorizontal: 4 },
  sendText: { fontSize: 15, fontWeight: '600', color: Colors.blue },
});
