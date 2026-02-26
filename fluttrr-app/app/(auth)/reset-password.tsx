import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { authApi } from '@/api/auth';
import { validatePassword, validateOtp } from '@/utils/validation';
import { extractErrorMessage } from '@/utils/error';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; password?: string }>({});

  const handleReset = async () => {
    const codeError = validateOtp(code);
    const passwordError = validatePassword(newPassword);
    if (codeError || passwordError) {
      setErrors({
        code: codeError || undefined,
        password: passwordError || undefined,
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await authApi.resetPassword({ email, code, newPassword });
      Alert.alert('Success', 'Your password has been reset. Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Reset Password" showBack />
      <View style={styles.content}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>Create new password</Text>
        <Text style={styles.subtitle}>
          Enter the code sent to{' '}
          <Text style={styles.emailText}>{email}</Text> and your new password.
        </Text>

        <View style={styles.form}>
          <Input
            label="Verification Code"
            icon="🔢"
            placeholder="Enter 6-digit code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            error={errors.code}
          />

          <Input
            label="New Password"
            icon="🔒"
            placeholder="Min 8 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? '🙈' : '👁️'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            error={errors.password}
          />

          <Button
            title="Reset Password"
            onPress={handleReset}
            loading={loading}
          />
        </View>
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
  emailText: {
    color: Colors.blue,
    fontWeight: '600',
  },
  form: {
    width: '100%',
    marginTop: 24,
  },
});
