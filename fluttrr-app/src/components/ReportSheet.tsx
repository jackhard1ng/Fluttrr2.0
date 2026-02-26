import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Button } from '@/components/ui/Button';
import { usersApi } from '@/api/users';

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  reportType: 'USER' | 'BUSINESS' | 'EVENT' | 'MESSAGE' | 'MOMENT';
  targetId: string;
}

const REASONS = [
  'Spam or scam',
  'Harassment or bullying',
  'Inappropriate content',
  'False information',
  'Impersonation',
  'Other',
];

export function ReportSheet({ visible, onClose, reportType, targetId }: ReportSheetProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please select a reason for your report.');
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.report({
        reportType,
        targetId,
        reason: selectedReason,
        details: details.trim() || undefined,
      });
      Alert.alert('Report Submitted', 'Thank you. We will review this report shortly.');
      onClose();
      setSelectedReason(null);
      setDetails('');
    } catch {
      Alert.alert('Error', 'Unable to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Report</Text>
          <Text style={s.subtitle}>Why are you reporting this?</Text>

          {REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[s.reasonRow, selectedReason === reason && s.reasonRowSelected]}
              onPress={() => setSelectedReason(reason)}
            >
              <View style={[s.radio, selectedReason === reason && s.radioSelected]} />
              <Text style={s.reasonText}>{reason}</Text>
            </TouchableOpacity>
          ))}

          <TextInput
            style={s.detailsInput}
            placeholder="Additional details (optional)"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            value={details}
            onChangeText={setDetails}
          />

          <View style={s.actions}>
            <Button title="Cancel" variant="outline" onPress={onClose} small style={{ flex: 1 }} />
            <Button
              title={submitting ? 'Submitting...' : 'Submit Report'}
              onPress={handleSubmit}
              small
              disabled={!selectedReason || submitting}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: Layout.radius.md,
    marginBottom: 4,
  },
  reasonRowSelected: { backgroundColor: Colors.dark },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 12,
  },
  radioSelected: { borderColor: Colors.blue, backgroundColor: Colors.blue },
  reasonText: { fontSize: 14, color: Colors.text },
  detailsInput: {
    backgroundColor: Colors.dark,
    borderRadius: Layout.radius.md,
    padding: 12,
    color: Colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 12,
    marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 12 },
});
