import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';
import { usersApi } from '@/api/users';
import { uploadsApi } from '@/api/uploads';
import { extractErrorMessage } from '@/utils/error';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const { data: uploadData } = await uploadsApi.upload({
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      const updatedPhotos = [...(user?.photos || []), uploadData.url];
      const { data } = await usersApi.updateMe({ photos: updatedPhotos });
      setUser(data);
    } catch (err) {
      Alert.alert('Upload failed', extractErrorMessage(err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert('Remove Photo', 'Remove this photo from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedPhotos = (user?.photos || []).filter((_, i) => i !== index);
            const { data } = await usersApi.updateMe({ photos: updatedPhotos });
            setUser(data);
          } catch (err) {
            Alert.alert('Error', extractErrorMessage(err));
          }
        },
      },
    ]);
  };

  const photos = user?.photos || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => router.push('/(user)/(profile)/edit')}>
          <Text style={styles.editBtn}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Profile card */}
        <Card variant="bordered" style={styles.profileCard}>
          <Avatar uri={user?.profilePhoto} size={80} ring={Colors.blue} />
          <Text style={styles.name}>{user?.displayName}</Text>
          <Text style={styles.username}>@{user?.username}</Text>
          {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
          {user?.city && <Text style={styles.city}>{user.city}</Text>}
        </Card>

        {/* Photo Gallery */}
        <Card style={styles.photosCard}>
          <View style={styles.photosHeader}>
            <Text style={styles.photosTitle}>Photos</Text>
            {photos.length < 9 && (
              <TouchableOpacity onPress={handleAddPhoto} disabled={uploadingPhoto}>
                <Text style={[styles.addPhotoBtn, uploadingPhoto && { opacity: 0.5 }]}>
                  {uploadingPhoto ? 'Uploading...' : '+ Add'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {photos.length > 0 ? (
            <View style={styles.photosGrid}>
              {photos.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  onLongPress={() => handleRemovePhoto(i)}
                  activeOpacity={0.8}
                  style={styles.photoThumb}
                >
                  <Image source={{ uri }} style={styles.photoImage} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity onPress={handleAddPhoto} disabled={uploadingPhoto}>
              <Text style={styles.photosEmpty}>
                {uploadingPhoto ? 'Uploading...' : 'Tap to add photos to your profile'}
              </Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Menu items */}
        <Card style={styles.menuCard}>
          <MenuItem label="My Events" onPress={() => router.push('/(user)/(profile)/my-events')} />
          <MenuItem label="Notifications" onPress={() => router.push('/(user)/(home)/notifications')} />
          <MenuItem label="Settings" onPress={() => router.push('/(user)/(profile)/settings')} />
          <MenuItem label="Help & FAQ" onPress={() => router.push('/(user)/(profile)/help')} />
        </Card>

        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="danger"
          style={{ marginTop: 16 }}
        />

        <Text style={styles.version}>Fluttrr v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={menuStyles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={menuStyles.label}>{label}</Text>
      <Text style={menuStyles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  arrow: {
    fontSize: 18,
    color: Colors.textMuted,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  editBtn: {
    fontSize: 15,
    color: Colors.blue,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  username: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  city: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
  },
  // Photo gallery
  photosCard: { marginBottom: 16 },
  photosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  photosTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  addPhotoBtn: { fontSize: 13, fontWeight: '600', color: Colors.blue },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoThumb: { width: '31.5%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%', backgroundColor: Colors.surface },
  photosEmpty: { fontSize: 13, color: Colors.blue, textAlign: 'center', paddingVertical: 20 },
  // Menu
  menuCard: {
    marginBottom: 16,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 16,
  },
});
