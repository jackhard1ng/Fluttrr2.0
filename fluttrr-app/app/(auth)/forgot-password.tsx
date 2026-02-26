import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { authApi } from '@/api/auth';
import { validateEmail } from '@/utils/validation';
import { extractErrorMessage } from '@/utils/error';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setError(undefined);
    setLoading(true);

    try {
      await authApi.forgotPassword({ email });
      Alert.alert(
        'Code Sent',
        'If an account exists with that email, a password reset code has been sent.',
        [
          {
            text: 'OK',
            onPress: () =>
              router.push({
                pathname: '/(auth)/reset-password',
                params: { email },
              }),
          },
        ],
      );
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Forgot Password" showBack />
      <View style={styles.content}>
        <Text style={styles.emoji}>🔑</Text>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a code to reset your password.
        </Text>

        <Input
          label="Email"
          icon="📧"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={error}
          containerStyle={{ width: '100%', marginTop: 24 }}
        />

        <Button
          title="Send Reset Code"
          onPress={handleSubmit}
          loading={loading}
        />
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
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
