import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/utils/date';
import { momentsApi, type MomentWithCounts } from '@/api/moments';
import { useAuthStore } from '@/stores/auth.store';

interface MomentCardProps {
  moment: MomentWithCounts;
  onComment?: () => void;
  onDelete?: () => void;
}

export function MomentCard({ moment, onComment, onDelete }: MomentCardProps) {
  const { user } = useAuthStore();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(moment.likeCount);

  const isOwner = user?.id === moment.user.id;

  const handleLike = async () => {
    const prevLiked = liked;
    const prevCount = likeCount;
    // Optimistic update
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try {
      if (prevLiked) {
        const { data } = await momentsApi.unlike(moment.id);
        setLikeCount(data.likeCount);
      } else {
        const { data } = await momentsApi.like(moment.id);
        setLikeCount(data.likeCount);
      }
    } catch {
      // Rollback on failure
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Moment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await momentsApi.delete(moment.id);
            onDelete?.();
          } catch {
            Alert.alert('Error', 'Could not delete moment. Try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <Avatar uri={moment.user.profilePhoto} size={36} />
        <View style={s.headerInfo}>
          <Text style={s.displayName}>{moment.user.displayName}</Text>
          <Text style={s.time}>{formatRelativeTime(moment.createdAt)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete}>
            <Text style={s.moreBtn}>...</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {moment.content && <Text style={s.content}>{moment.content}</Text>}

      {/* Photos */}
      {moment.photos.length > 0 && (
        <View style={s.photosRow}>
          {moment.photos.slice(0, 3).map((photo, i) => (
            <Image key={i} source={{ uri: photo }} style={s.photo} resizeMode="cover" />
          ))}
          {moment.photos.length > 3 && (
            <View style={s.morePhotos}>
              <Text style={s.morePhotosText}>+{moment.photos.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={handleLike}>
          <Text style={s.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={[s.actionText, liked && { color: Colors.error }]}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onComment}>
          <Text style={s.actionIcon}>💬</Text>
          <Text style={s.actionText}>{moment.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Layout.radius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  headerInfo: { flex: 1 },
  displayName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  time: { fontSize: 11, color: Colors.textMuted },
  moreBtn: { fontSize: 18, color: Colors.textSecondary, paddingHorizontal: 8 },
  content: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 10 },
  photosRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  photo: { width: 100, height: 100, borderRadius: Layout.radius.md },
  morePhotos: {
    width: 100,
    height: 100,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  actions: { flexDirection: 'row', gap: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 16 },
  actionText: { fontSize: 13, color: Colors.textSecondary },
});
