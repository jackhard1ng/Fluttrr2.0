import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Share,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';

export default function InviteScreen() {
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId?: string; eventTitle?: string }>();
  const { user } = useAuthStore();

  const inviteCode = `${(user?.username || 'FLUTTRR').toUpperCase()}-KC-${new Date().getFullYear()}`;
  const shareMessage = eventId
    ? `Join me at "${eventTitle}" on Fluttrr! fluttrr://event/${eventId}`
    : `Join me on Fluttrr - discover KC events & meet new people! Use code: ${inviteCode}`;

  const handleShare = () => {
    Share.share({
      message: shareMessage,
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Invite" showBack />

      <View style={s.content}>
        {/* Invite code card */}
        <View style={s.codeCard}>
          <Text style={s.codeLabel}>Your code</Text>
          <Text style={s.codeText}>{inviteCode}</Text>
        </View>

        {eventId && (
          <View style={s.eventCard}>
            <Text style={s.eventLabel}>Sharing event</Text>
            <Text style={s.eventTitle}>{eventTitle || 'Untitled Event'}</Text>
          </View>
        )}

        {/* Share button */}
        <Button
          title="📤  Share Invite Link"
          onPress={handleShare}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  codeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: { fontSize: 13, color: Colors.textMuted, marginBottom: 6 },
  codeText: { fontSize: 24, fontWeight: '700', color: Colors.blue, letterSpacing: 2 },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  eventLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
});
