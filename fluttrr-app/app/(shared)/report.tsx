import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { usersApi } from '@/api/users';
import { extractErrorMessage } from '@/utils/error';

const REPORT_TYPES = [
  { key: 'SPAM', label: 'Spam' },
  { key: 'HARASSMENT', label: 'Harassment' },
  { key: 'INAPPROPRIATE', label: 'Inappropriate' },
  { key: 'OTHER', label: 'Other' },
] as const;

export default function ReportScreen() {
  const router = useRouter();
  const { targetId, targetType } = useLocalSearchParams<{ targetId: string; targetType?: string }>();
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async (reportType: string) => {
    if (!targetId) {
      Alert.alert('Error', 'Missing target');
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.report({
        targetId,
        reportType,
        reason: reportType,
      });
      Alert.alert('Report Submitted', 'Thank you for helping keep Fluttrr safe.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Report" showBack />

      <View style={s.content}>
        <Text style={s.subtitle}>What's the issue?</Text>

        {submitting ? (
          <ActivityIndicator size="large" color={Colors.blue} style={{ marginTop: 40 }} />
        ) : (
          REPORT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={s.optionBtn}
              onPress={() => handleReport(type.key)}
              activeOpacity={0.7}
            >
              <Text style={s.optionText}>{type.label}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 16 },
  optionBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  optionText: { fontSize: 15, color: Colors.text },
});
