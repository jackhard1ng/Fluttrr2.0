import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/auth.store';
import { businessApi } from '@/api/business';
import { uploadsApi } from '@/api/uploads';
import { extractErrorMessage } from '@/utils/error';

export default function BizProfileScreen() {
  const router = useRouter();
  const { business, logout, setBusiness } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState(business?.businessName || '');
  const [description, setDescription] = useState(business?.description || '');
  const [address, setAddress] = useState(business?.address || '');
  const [phone, setPhone] = useState(business?.phone || '');
  const [website, setWebsite] = useState(business?.website || '');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await businessApi.updateProfile({
        businessName: businessName.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
      });
      setBusiness(data);
      setEditing(false);
      Alert.alert('Saved', 'Profile updated!');
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingLogo(true);
    try {
      const asset = result.assets[0];
      const { data: uploadData } = await uploadsApi.upload({
        uri: asset.uri,
        name: asset.fileName || 'logo.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      const { data } = await businessApi.updateProfile({ logo: uploadData.url });
      setBusiness(data);
    } catch (err) {
      Alert.alert('Upload failed', extractErrorMessage(err));
    } finally {
      setUploadingLogo(false);
    }
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
      const updatedPhotos = [...(business?.photos || []), uploadData.url];
      const { data } = await businessApi.updateProfile({ photos: updatedPhotos } as any);
      setBusiness(data);
    } catch (err) {
      Alert.alert('Upload failed', extractErrorMessage(err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedPhotos = (business?.photos || []).filter((_, i) => i !== index);
            const { data } = await businessApi.updateProfile({ photos: updatedPhotos } as any);
            setBusiness(data);
          } catch (err) {
            Alert.alert('Error', extractErrorMessage(err));
          }
        },
      },
    ]);
  };

  const photos = business?.photos || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business Profile</Text>
        {!editing && (
          <Button title="Edit" onPress={() => setEditing(true)} variant="ghost" small full={false} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo & Name Card */}
        <Card variant="bordered" style={styles.profileCard}>
          <TouchableOpacity onPress={handlePickLogo} activeOpacity={0.7} style={styles.logoWrap}>
            {business?.logo ? (
              <Image source={{ uri: business.logo }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>
                  {business?.businessName?.charAt(0)?.toUpperCase() || 'B'}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraText}>{uploadingLogo ? '...' : '+'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.bizName}>{business?.businessName}</Text>
          <Badge
            label={business?.verified ? 'Verified' : 'Pending'}
            color={business?.verified ? Colors.success : Colors.warn}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Photos Section */}
        <Card style={styles.photosCard}>
          <View style={styles.photosHeader}>
            <Text style={styles.photosTitle}>Photos</Text>
            <TouchableOpacity onPress={handleAddPhoto} disabled={uploadingPhoto}>
              <Text style={[styles.addPhotoBtn, uploadingPhoto && { opacity: 0.5 }]}>
                {uploadingPhoto ? 'Uploading...' : '+ Add Photo'}
              </Text>
            </TouchableOpacity>
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
            <Text style={styles.photosEmpty}>
              Add photos of your business to build trust with customers
            </Text>
          )}
        </Card>

        {editing ? (
          <View style={styles.editForm}>
            <Input label="Business Name" value={businessName} onChangeText={setBusinessName} />
            <Input label="Description" value={description} onChangeText={setDescription} multiline />
            <Input label="Address" value={address} onChangeText={setAddress} />
            <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label="Website" value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" />
            <View style={styles.editActions}>
              <Button title="Cancel" onPress={() => setEditing(false)} variant="secondary" small full={false} />
              <Button title="Save" onPress={handleSave} loading={saving} small full={false} />
            </View>
          </View>
        ) : (
          <Card style={styles.detailsCard}>
            <DetailRow label="Email" value={business?.email || ''} />
            <DetailRow label="Address" value={business?.address || ''} />
            {business?.phone && <DetailRow label="Phone" value={business.phone} />}
            {business?.website && <DetailRow label="Website" value={business.website} />}
            {business?.description && <DetailRow label="About" value={business.description} />}
          </Card>
        )}

        <Card style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(business)/(profile)/reviews')}>
            <Text style={styles.menuLabel}>Reviews</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(business)/(profile)/subscriptions')}>
            <Text style={styles.menuLabel}>Subscription</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Button title="Sign Out" onPress={() => {
          Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ]);
        }} variant="danger" style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <View style={detailStyles.info}>
        <Text style={detailStyles.label}>{label}</Text>
        <Text style={detailStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  info: { flex: 1 },
  label: { fontSize: 12, color: Colors.textSecondary },
  value: { fontSize: 14, color: Colors.text, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  scroll: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 8 },
  profileCard: { alignItems: 'center', paddingVertical: 20, marginBottom: 16 },
  logoWrap: { position: 'relative' },
  logoImage: { width: 80, height: 80, borderRadius: 16, backgroundColor: Colors.surface },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.blue + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.blue + '40',
  },
  logoPlaceholderText: { fontSize: 32, fontWeight: '700', color: Colors.blue },
  cameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  bizName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 12 },
  // Photos section
  photosCard: { marginBottom: 16 },
  photosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  photosTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  addPhotoBtn: { fontSize: 13, fontWeight: '600', color: Colors.blue },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: '31%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%', backgroundColor: Colors.surface },
  photosEmpty: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  // Other sections
  editForm: { marginTop: 8 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  detailsCard: { marginBottom: 16 },
  menuCard: { marginBottom: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text },
  menuArrow: { fontSize: 18, color: Colors.textMuted },
});
