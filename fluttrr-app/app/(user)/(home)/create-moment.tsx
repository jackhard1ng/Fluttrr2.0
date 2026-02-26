import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { momentsApi } from '@/api/moments';
import { extractErrorMessage } from '@/utils/error';

const BG_COLORS = [
  '#7C3AED', // purple
  '#DC2626', // red
  '#F97316', // orange
  '#10B981', // green
  '#2563EB', // blue
  '#EC4899', // pink
];

export default function CreateMomentScreen() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Write something first!');
      return;
    }
    setPublishing(true);
    try {
      await momentsApi.create({ content: content.trim() });
      Alert.alert('Published!', 'Your moment is live.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Create Moment" showBack />

      <View style={s.content}>
        {/* Story preview */}
        <View style={[s.preview, { backgroundColor: bgColor }]}>
          <TextInput
            style={s.previewInput}
            value={content}
            onChangeText={setContent}
            placeholder="What's happening..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            textAlignVertical="center"
            maxLength={500}
          />
        </View>

        {/* Color picker */}
        <View style={s.colorRow}>
          {BG_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                s.colorSwatch,
                { backgroundColor: color },
                bgColor === color && s.colorSwatchActive,
              ]}
              onPress={() => setBgColor(color)}
            />
          ))}
        </View>

        {/* Publish */}
        <Button
          title="Publish Moment"
          onPress={handlePublish}
          loading={publishing}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  preview: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewInput: {
    width: '100%',
    minHeight: 200,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: '#fff',
  },
});
