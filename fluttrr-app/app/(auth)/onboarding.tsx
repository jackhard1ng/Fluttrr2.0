import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Button } from '@/components/ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_KEY = '@fluttrr_onboarded';

const SLIDES = [
  {
    emoji: '🔍',
    title: 'Discover Events',
    description: 'Find things to do, posted by local businesses.',
    color: Colors.blue,
  },
  {
    emoji: '🤝',
    title: 'Meet People',
    description: 'See who\'s going, join events, chat with attendees.',
    color: Colors.cyan,
  },
  {
    emoji: '📸',
    title: 'Share Moments',
    description: 'Photos and highlights from real KC experiences.',
    color: Colors.purple,
  },
  {
    emoji: '🦋',
    title: 'Support Local',
    description: 'Every event supports a Kansas City business.',
    color: Colors.success,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onDone = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/welcome');
  }, [router]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      onDone();
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[s.slide, { width: SCREEN_WIDTH }]}>
      <View style={[s.iconCircle, { backgroundColor: item.color + '15' }]}>
        <Text style={s.iconEmoji}>{item.emoji}</Text>
      </View>
      <Text style={s.slideTitle}>{item.title}</Text>
      <Text style={s.slideDesc}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Skip button */}
      <View style={s.topBar}>
        <View />
        <TouchableOpacity onPress={onDone}>
          <Text style={s.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={s.flatList}
      />

      {/* Pagination dots */}
      <View style={s.pagination}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              {
                width: i === currentIndex ? 28 : 8,
                backgroundColor: i === currentIndex ? Colors.blue : Colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={s.buttonRow}>
        {currentIndex > 0 ? (
          <Button title="Back" onPress={goBack} variant="secondary" small full={false} />
        ) : (
          <View />
        )}
        <Button
          title={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={goNext}
          small
          full={false}
        />
      </View>
    </SafeAreaView>
  );
}

/** Check if onboarding has been completed */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  flatList: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconEmoji: { fontSize: 56 },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
