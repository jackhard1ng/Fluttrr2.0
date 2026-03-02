import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CATEGORY_META, KC_NEIGHBORHOODS } from '@/constants/categories';
import { EventCategory, RecurrenceType, EventStatus } from '@/types/enums';
import { businessApi } from '@/api/business';
import { eventsApi } from '@/api/events';
import { extractErrorMessage } from '@/utils/error';

const RECURRENCE_OPTIONS = [
  { value: RecurrenceType.WEEKLY, label: 'Weekly' },
  { value: RecurrenceType.BIWEEKLY, label: 'Biweekly' },
  { value: RecurrenceType.MONTHLY, label: 'Monthly' },
  { value: RecurrenceType.FIRST_FRIDAY, label: 'First Friday' },
] as const;

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
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
  const [status, setStatus] = useState<EventStatus>(EventStatus.ACTIVE);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await eventsApi.getById(id);
        setTitle(data.title);
        setDescription(data.description || '');
        setCategory(data.category as EventCategory);
        setDate(new Date(data.date));
        setArea(data.area || '');
        setMaxSpots(data.maxSpots ? String(data.maxSpots) : '');
        setRecurring((data.recurring as RecurrenceType) || null);
        setEmoji(data.emoji || '');
        setStatus(data.status as EventStatus);

        // Parse start time (handles both "19:00" and "7:00 PM" formats)
        const parseTime = (timeStr: string): Date => {
          const d = new Date();
          if (timeStr.includes('AM') || timeStr.includes('PM')) {
            const isPM = timeStr.includes('PM');
            const cleaned = timeStr.replace(/\s*(AM|PM)/i, '');
            const [h, m] = cleaned.split(':').map(Number);
            let hours = h || 0;
            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
            d.setHours(hours, m || 0, 0, 0);
          } else {
            const [h, m] = timeStr.split(':').map(Number);
            d.setHours(h || 0, m || 0, 0, 0);
          }
          return d;
        };

        setStartTime(parseTime(data.startTime || '12:00'));
        if (data.endTime) {
          setEndTime(parseTime(data.endTime));
        }
      } catch (err) {
        Alert.alert('Error', extractErrorMessage(err));
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formatDateDisplay = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const formatTimeDisplay = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const pad = (n: number) => n.toString().padStart(2, '0');

  const handleSubmit = async () => {
    if (!id) return Alert.alert('Error', 'Invalid event');
    if (!title.trim()) return Alert.alert('Required', 'Please enter an event title');
    if (!category) return Alert.alert('Required', 'Please select a category');

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

      await businessApi.updateEvent(id!, {
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

      Alert.alert('Updated', 'Event updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await businessApi.deleteEvent(id!);
              Alert.alert('Deleted', 'Event deleted.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (err) {
              Alert.alert('Error', extractErrorMessage(err));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
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

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="Edit Event" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Edit Event" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="Event Title"
            placeholder="What's happening?"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Input
            label="Description (optional)"
            placeholder="Tell people about your event..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={2000}
          />

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

          <Text style={s.sectionLabel}>Date</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={s.pickerIcon}>📅</Text>
            <Text style={s.pickerText}>{formatDateDisplay(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              themeVariant="dark"
            />
          )}

          <View style={s.timeRow}>
            <View style={s.timeCol}>
              <Text style={s.sectionLabel}>Start Time</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowStartPicker(true)}>
                <Text style={s.pickerIcon}>🕐</Text>
                <Text style={s.pickerText}>{formatTimeDisplay(startTime)}</Text>
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
                <Text style={s.pickerText}>{endTime ? formatTimeDisplay(endTime) : 'Optional'}</Text>
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

          <Input
            label="Max Spots (optional)"
            placeholder="Unlimited if empty"
            value={maxSpots}
            onChangeText={(t) => setMaxSpots(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            icon="👥"
          />

          <Input
            label="Custom Emoji (optional)"
            placeholder="e.g. 🎸 🏈 🎭"
            value={emoji}
            onChangeText={setEmoji}
            maxLength={4}
          />

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

          <Button
            title="Save Changes"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!title.trim() || !category}
            style={{ marginTop: 16 }}
          />
          <Button
            title="Delete Event"
            onPress={handleDelete}
            variant="danger"
            loading={deleting}
            style={{ marginTop: 8 }}
          />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="secondary"
            style={{ marginTop: 8, marginBottom: 20 }}
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
