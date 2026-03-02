import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Button } from '@/components/ui/Button';
import { FluttrLogo } from '@/components/ui/FluttrLogo';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo bounce-in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Content fade-in after logo
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo area with glow */}
        <View style={styles.logoArea}>
          <View style={styles.glow} />
          <Animated.View
            style={{
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            }}
          >
            <FluttrLogo size={80} />
          </Animated.View>
          <Animated.Text style={[styles.logoText, { opacity: logoOpacity }]}>
            fluttrr
          </Animated.Text>
        </View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineArea, { opacity: contentOpacity }]}>
          <Text style={styles.tagline}>Discover Kansas City</Text>
          <Text style={styles.tagline}>Events & Experiences</Text>
          <Text style={styles.subtitle}>
            Find events posted by local businesses,{'\n'}
            join group chats, and meet new people.
          </Text>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View style={[styles.buttonArea, { opacity: contentOpacity }]}>
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
          />
          <Button
            title="Create Account"
            onPress={() => router.push('/(auth)/register')}
            variant="outline"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="🏪  I'm a Business"
            onPress={() => router.push('/(auth)/login?type=business')}
            variant="secondary"
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.blueGlow,
    top: -50,
  },
  logoImage: {
    marginBottom: 12,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1,
  },
  taglineArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  tagline: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  buttonArea: {
    width: '100%',
    gap: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 16,
  },
});
