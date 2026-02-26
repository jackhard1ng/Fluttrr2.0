import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { adminApi } from '@/api/admin';
import { extractErrorMessage } from '@/utils/error';

const TARGETS = [
  { key: 'all_users', label: '👥 All Users' },
  { key: 'all_businesses', label: '🏪 All Businesses' },
  { key: 'user', label: '👤 Specific User' },
  { key: 'business', label: '🏢 Specific Business' },
] as const;

export default function AdminMessagesScreen() {
  const [targetType, setTargetType] = useState('all_users');
  const [targetId, setTargetId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const needsTargetId = targetType === 'user' || targetType === 'business';

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      Alert.alert('Error', 'Subject and body are required.');
      return;
    }
    if (needsTargetId && !targetId.trim()) {
      Alert.alert('Error', 'Target ID is required.');
      return;
    }

    Alert.alert('Send Message', `Send to ${targetType}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setSending(true);
          try {
            await adminApi.sendMessage({
              targetType,
              targetId: needsTargetId ? targetId.trim() : undefined,
              subject: subject.trim(),
              body: body.trim(),
            });
            Alert.alert('Sent', 'Admin message sent successfully.');
            setSubject('');
            setBody('');
            setTargetId('');
          } catch (err) {
            Alert.alert('Error', extractErrorMessage(err));
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>📨 Send Message</Text>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.label}>Target Audience</Text>
          <View style={styles.targetRow}>
            {TARGETS.map((t) => (
              <Chip
                key={t.key}
                label={t.label}
                selected={targetType === t.key}
                onPress={() => setTargetType(t.key)}
              />
            ))}
          </View>

          {needsTargetId && (
            <Input
              label="Target ID (UUID)"
              placeholder="Paste user or business UUID"
              value={targetId}
              onChangeText={setTargetId}
              autoCapitalize="none"
            />
          )}

          <Input
            label="Subject"
            placeholder="Message subject"
            value={subject}
            onChangeText={setSubject}
          />

          <Input
            label="Body"
            placeholder="Write your message..."
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={6}
          />

          <Button title="Send Message" onPress={handleSend} loading={sending} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, paddingHorizontal: 16, paddingTop: 10 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },
  card: { paddingVertical: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  targetRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
});
