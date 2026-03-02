import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CATEGORY_META, KC_NEIGHBORHOODS } from '@/constants/categories';
import { EventCategory, RecurrenceType } from '@/types/enums';
import { businessApi } from '@/api/business';
import { extractErrorMessage } from '@/utils/error';

const RECURRENCE_OPTIONS = [
  { value: RecurrenceType.WEEKLY, label: 'Weekly' },
  { value: RecurrenceType.BIWEEKLY, label: 'Biweekly' },
  { value: RecurrenceType.MONTHLY, label: 'Monthly' },
  { value: RecurrenceType.FIRST_FRIDAY, label: 'First Friday' },
] as const;

export default function CreateEventScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [maxSpots, setMaxSpots] = useState('');
  const [area, setArea] = useState('');
  const [recurring, setRecurring] = useState<RecurrenceType | null>(null);
  const [emoji, setEmoji] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const pad = (n: number) => n.toString().padStart(2, '0');

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert('Required', 'Please enter an event title');
    if (!category) return Alert.alert('Required', 'Please select a category');

    // Validate date is not in the past (could be stale if screen was left open)
    const now = new Date();
    if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return Alert.alert('Invalid Date', 'Event date cannot be in the past');
    }

    // Validate end time is after start time (if set)
    if (endTime) {
      const startMins = startTime.getHours() * 60 + startTime.getMinutes();
      const endMins = endTime.getHours() * 60 + endTime.getMinutes();
      if (endMins <= startMins) {
        return Alert.alert('Invalid Time', 'End time must be after start time');
      }
    }

    setSubmitting(true);
    try {
      const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      const startStr = `${pad(startTime.getHours())}:${pad(startTime.getMinutes())}`;
      const endStr = endTime ? `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}` : undefined;

      await businessApi.createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        date: dateStr,
        startTime: startStr,
        endTime: endStr,
        maxSpots: maxSpots ? parseInt(maxSpots) : undefined,
        area: area || undefined,
        recurring: recurring || undefined,
        emoji: emoji.trim() || undefined,
      });

      Alert.alert('Success', 'Event created!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setDate(selected);
  };

  const onStartChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selected) setStartTime(selected);
  };

  const onEndChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selected) setEndTime(selected);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Create Event" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Input
            label="Event Title"
            placeholder="What's happening?"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          {/* Description */}
          <Input
            label="Description (optional)"
            placeholder="Tell people about your event..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={2000}
          />

          {/* Category */}
          <Text style={s.sectionLabel}>Category</Text>
          <View style={s.chipGrid}>
            {(Object.keys(CATEGORY_META) as EventCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              return (
                <Chip
                  key={cat}
                  label={meta.label}
                  emoji={meta.emoji}
                  selected={category === cat}
                  onPress={() => setCategory(cat)}
                  color={meta.color}
                />
              );
            })}
          </View>

          {/* Date */}
          <Text style={s.sectionLabel}>Date</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={s.pickerIcon}>📅</Text>
            <Text style={s.pickerText}>{formatDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={onDateChange}
              themeVariant="dark"
            />
          )}

          {/* Times */}
          <View style={s.timeRow}>
            <View style={s.timeCol}>
              <Text style={s.sectionLabel}>Start Time</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowStartPicker(true)}>
                <Text style={s.pickerIcon}>🕐</Text>
                <Text style={s.pickerText}>{formatTime(startTime)}</Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartChange}
                  themeVariant="dark"
                />
              )}
            </View>
            <View style={s.timeCol}>
              <Text style={s.sectionLabel}>End Time</Text>
              <TouchableOpacity
                style={s.pickerBtn}
                onPress={() => {
                  if (!endTime) setEndTime(new Date(startTime.getTime() + 2 * 60 * 60 * 1000));
                  setShowEndPicker(true);
                }}
              >
                <Text style={s.pickerIcon}>🕕</Text>
                <Text style={s.pickerText}>{endTime ? formatTime(endTime) : 'Optional'}</Text>
              </TouchableOpacity>
              {showEndPicker && endTime && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onEndChange}
                  themeVariant="dark"
                />
              )}
            </View>
          </View>

          {/* Neighborhood */}
          <Text style={s.sectionLabel}>Neighborhood</Text>
          <View style={s.chipGrid}>
            {KC_NEIGHBORHOODS.filter((n) => n.label !== 'All KC').map((n) => (
              <Chip
                key={n.label}
                label={n.label}
                selected={area === n.label}
                onPress={() => setArea(area === n.label ? '' : n.label)}
              />
            ))}
          </View>

          {/* Max Spots */}
          <Input
            label="Max Spots (optional)"
            placeholder="Unlimited if empty"
            value={maxSpots}
            onChangeText={(t) => setMaxSpots(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            icon="👥"
          />

          {/* Recurrence */}
          <Text style={s.sectionLabel}>Recurring (optional)</Text>
          <View style={s.chipGrid}>
            {RECURRENCE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={recurring === opt.value}
                onPress={() => setRecurring(recurring === opt.value ? null : opt.value)}
              />
            ))}
          </View>

          {/* Submit */}
          <Button
            title="Create Event"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!title.trim() || !category}
            style={{ marginTop: 16 }}
          />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="secondary"
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 },
  sectionLabel: {
    fontSize: Layout.fontSize.sm,
    fontWeight: Layout.fontWeight.semibold as '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  pickerIcon: { fontSize: 16 },
  pickerText: { fontSize: Layout.fontSize.md, color: Colors.text },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeCol: { flex: 1 },
});
