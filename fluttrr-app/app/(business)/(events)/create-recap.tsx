import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { businessApi, type BusinessEventItem } from '@/api/business';
import { uploadsApi } from '@/api/uploads';
import { extractErrorMessage } from '@/utils/error';
import { formatEventDate } from '@/utils/date';
import { CATEGORY_META } from '@/constants/categories';
import type { EventCategory } from '@/types/enums';

export default function CreateRecapScreen() {
  const router = useRouter();
  const [pastEvents, setPastEvents] = useState<BusinessEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<BusinessEventItem | null>(null);
  const [caption, setCaption] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPastEvents = useCallback(async () => {
    try {
      const { data } = await businessApi.getEvents({ filter: 'past', limit: 50 });
      setPastEvents(data.events);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPastEvents();
  }, [fetchPastEvents]);

  const handleAddPhoto = async () => {
    if (photos.length >= 6) return Alert.alert('Limit', 'Maximum 6 photos per recap');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const { data } = await uploadsApi.upload({
        uri: asset.uri,
        name: asset.fileName || 'recap.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      setPhotos((prev) => [...prev, data.url]);
    } catch (err) {
      Alert.alert('Upload failed', extractErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedEvent) return Alert.alert('Required', 'Select an event first');

    setSubmitting(true);
    try {
      await businessApi.createRecap({
        eventId: selectedEvent.id,
        caption: caption.trim() || undefined,
        photos,
      });
      Alert.alert('Posted!', 'Your event recap is now visible on your profile.', [
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
      <ScreenHeader title="Post Event Recap" showBack />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Step 1: Select event */}
        <Text style={s.label}>Select a past event</Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.blue} style={{ paddingVertical: 20 }} />
        ) : pastEvents.length === 0 ? (
          <Text style={s.emptyText}>No past events to recap</Text>
        ) : (
          <View style={s.eventList}>
            {pastEvents.map((event) => {
              const catMeta = CATEGORY_META[event.category as EventCategory];
              const isSelected = selectedEvent?.id === event.id;
              return (
                <TouchableOpacity
                  key={event.id}
                  style={[s.eventOption, isSelected && s.eventOptionSelected]}
                  onPress={() => setSelectedEvent(event)}
                  activeOpacity={0.7}
                >
                  <View style={s.eventOptionInfo}>
                    <Text style={s.eventOptionTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={s.eventOptionMeta}>
                      {formatEventDate(event.date)} · {catMeta?.label} · {event.attendeeCount} attended
                    </Text>
                  </View>
                  {isSelected && <Text style={s.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedEvent && (
          <>
            {/* Step 2: Add photos */}
            <Text style={[s.label, { marginTop: 20 }]}>Photos</Text>
            <View style={s.photosRow}>
              {photos.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => handleRemovePhoto(i)} style={s.photoThumb}>
                  <Image source={{ uri }} style={s.photoImage} />
                  <View style={s.removeIcon}>
                    <Text style={s.removeText}>×</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {photos.length < 6 && (
                <TouchableOpacity onPress={handleAddPhoto} disabled={uploading} style={s.addPhotoBox}>
                  <Text style={s.addPhotoText}>{uploading ? '...' : '+'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Step 3: Caption */}
            <Input
              label="Caption (optional)"
              placeholder="How did the event go?"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            {/* Submit */}
            <Button
              title="Post Recap"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!selectedEvent}
              style={{ marginTop: 16 }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  eventList: { gap: 8, marginBottom: 8 },
  eventOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventOptionSelected: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blue + '10',
  },
  eventOptionInfo: { flex: 1 },
  eventOptionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  eventOptionMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  checkmark: { fontSize: 18, fontWeight: '700', color: Colors.blue, marginLeft: 8 },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%', backgroundColor: Colors.surface },
  removeIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  addPhotoBox: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.blue + '40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { fontSize: 24, color: Colors.blue },
});
