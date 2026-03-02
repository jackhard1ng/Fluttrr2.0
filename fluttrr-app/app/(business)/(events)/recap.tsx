import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { recapsApi } from '@/api/recaps';
import { uploadsApi } from '@/api/uploads';
import { extractErrorMessage } from '@/utils/error';

export default function CreateRecapScreen() {
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId: string; eventTitle: string }>();
  const router = useRouter();

  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - photos.length,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const asset of result.assets) {
        const { data } = await uploadsApi.upload({
          uri: asset.uri,
          name: asset.fileName || 'recap-photo.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
        uploadedUrls.push(data.url);
      }
      setPhotos((prev) => [...prev, ...uploadedUrls].slice(0, 10));
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
    if (!content.trim() && photos.length === 0) {
      Alert.alert('Empty Recap', 'Add some text or photos to share your event recap.');
      return;
    }

    setSaving(true);
    try {
      await recapsApi.create({
        eventId: eventId!,
        content: content.trim() || undefined,
        photos,
      });
      Alert.alert('Recap Posted!', 'Your event recap is now visible on your profile.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Recap</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Event reference */}
        <View style={styles.eventRef}>
          <Text style={styles.eventRefLabel}>Recap for</Text>
          <Text style={styles.eventRefTitle}>{eventTitle || 'Event'}</Text>
        </View>

        {/* Content input */}
        <Text style={styles.label}>Share how the event went</Text>
        <TextInput
          style={styles.textInput}
          value={content}
          onChangeText={setContent}
          placeholder="Tell people about the event... What happened? How was the turnout?"
          placeholderTextColor={Colors.textSecondary + '88'}
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{content.length}/2000</Text>

        {/* Photos */}
        <View style={styles.photosSection}>
          <View style={styles.photosHeader}>
            <Text style={styles.label}>Photos</Text>
            {photos.length < 10 && (
              <TouchableOpacity onPress={handleAddPhoto} disabled={uploading}>
                <Text style={[styles.addPhotoBtn, uploading && { opacity: 0.5 }]}>
                  {uploading ? 'Uploading...' : '+ Add Photos'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {photos.length > 0 ? (
            <View style={styles.photosGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(i)}
                  >
                    <Text style={styles.removePhotoText}>x</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity onPress={handleAddPhoto} disabled={uploading} style={styles.photoEmpty}>
              {uploading ? (
                <ActivityIndicator size="small" color={Colors.blue} />
              ) : (
                <Text style={styles.photoEmptyText}>Tap to add photos from your event</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Button
          title={saving ? 'Posting...' : 'Post Recap'}
          onPress={handleSubmit}
          loading={saving}
          disabled={saving || (!content.trim() && photos.length === 0)}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 15, color: Colors.blue, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 80 },
  eventRef: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 20,
  },
  eventRefLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  eventRefTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  photosSection: { marginBottom: 8 },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addPhotoBtn: { fontSize: 13, fontWeight: '600', color: Colors.blue },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: { width: '100%', height: '100%', backgroundColor: Colors.surface },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  photoEmpty: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: 30,
    alignItems: 'center',
  },
  photoEmptyText: { fontSize: 14, color: Colors.blue },
});
