import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/auth.store';
import { usersApi } from '@/api/users';
import { uploadsApi } from '@/api/uploads';
import { extractErrorMessage } from '@/utils/error';
import { Config } from '@/constants/config';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [saving, setSaving] = useState(false);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    try {
      const asset = result.assets[0];
      const { data } = await uploadsApi.upload({
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      setProfilePhoto(data.url);
    } catch (err) {
      Alert.alert('Upload failed', extractErrorMessage(err));
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await usersApi.updateMe({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
        profilePhoto: profilePhoto || undefined,
      });
      setUser(data);
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Edit Profile"
        showBack
        rightAction={
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[s.saveBtn, saving && { opacity: 0.5 }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Profile photo */}
        <TouchableOpacity style={s.photoSection} onPress={handlePickPhoto} activeOpacity={0.7}>
          <View style={s.avatarWrap}>
            <Avatar uri={profilePhoto || user?.profilePhoto} size={90} ring={Colors.blue} />
            <View style={s.cameraBadge}>
              <Text style={s.cameraEmoji}>📷</Text>
            </View>
          </View>
          <Text style={s.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>

        {/* Form fields */}
        <View style={s.form}>
          <Input
            label="Username"
            value={user?.username || ''}
            editable={false}
            icon="👤"
          />
          <Input
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            icon="✏️"
            placeholder="Your display name"
          />
          <Input
            label={`Bio (${bio.length}/${Config.MAX_BIO_LENGTH})`}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={Config.MAX_BIO_LENGTH}
            icon="📝"
            placeholder="Tell us about yourself..."
          />
          <Input
            label="City"
            value={city}
            onChangeText={setCity}
            icon="📍"
            placeholder="Kansas City, MO"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { paddingHorizontal: 20, paddingBottom: 80 },
  saveBtn: { fontSize: 15, fontWeight: '600', color: Colors.blue },
  photoSection: { alignItems: 'center', paddingVertical: 24 },
  avatarWrap: { position: 'relative' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraEmoji: { fontSize: 13 },
  changePhotoText: { fontSize: 13, color: Colors.blue, fontWeight: '600', marginTop: 8 },
  form: { gap: 4 },
});
