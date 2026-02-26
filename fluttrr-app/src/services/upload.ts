import * as ImagePicker from 'expo-image-picker';
import client from '@/api/client';

interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function pickMultipleImages(maxCount = 10): Promise<string[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: maxCount,
    quality: 0.8,
  });

  if (result.canceled || !result.assets) return [];
  return result.assets.map((a) => a.uri);
}

export async function uploadImage(uri: string): Promise<UploadResult> {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1] : 'jpg';
  const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const { data } = await client.post<UploadResult>('/api/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

export async function uploadMultipleImages(uris: string[]): Promise<UploadResult[]> {
  const results = await Promise.all(uris.map(uploadImage));
  return results;
}
