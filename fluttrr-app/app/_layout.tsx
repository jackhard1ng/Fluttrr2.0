import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const ONBOARDING_KEY = '@fluttrr_onboarded';

export default function RootLayout() {
  const { isAuthenticated, isLoading, accountType, isAdmin, pendingOtpEmail, hydrate } =
    useAuthStore();
  const router = useRouter();
  const segments = useSegments() as string[];
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    hydrate();
    AsyncStorage.getItem(ONBOARDING_KEY).then((val: string | null) => {
      setNeedsOnboarding(val !== 'true');
      setOnboardingChecked(true);
    });
  }, [hydrate]);

  // Auth gate: redirect based on auth state
  useEffect(() => {
    if (isLoading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === '(auth)';

    // First-time launch → show onboarding
    if (needsOnboarding && !isAuthenticated) {
      if (segments[1] !== 'onboarding') {
        router.replace('/(auth)/onboarding');
      }
      return;
    }

    // If pending OTP, redirect to verify-otp
    if (pendingOtpEmail) {
      if (segments[1] !== 'verify-otp') {
        router.replace({
          pathname: '/(auth)/verify-otp',
          params: { email: pendingOtpEmail },
        });
      }
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in -> go to auth
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in but still in auth screens -> go to main flow
      if (isAdmin) {
        router.replace('/(admin)/(dashboard)');
      } else if (accountType === 'business') {
        router.replace('/(business)/(dashboard)');
      } else {
        router.replace('/(user)/(home)');
      }
    }
  }, [isAuthenticated, isLoading, accountType, isAdmin, pendingOtpEmail, segments, onboardingChecked, needsOnboarding]);

  if (isLoading || !onboardingChecked) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={Colors.dark} />
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
});
