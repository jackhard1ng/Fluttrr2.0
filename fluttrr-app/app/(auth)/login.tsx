import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth.store';
import { validateEmail, validatePassword } from '@/utils/validation';
import { extractErrorMessage } from '@/utils/error';
import { FluttrLogo } from '@/components/ui/FluttrLogo';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const login = useAuthStore((s) => s.login);

  const [isBusiness, setIsBusiness] = useState(params.type === 'business');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (emailError || passwordError) {
      setErrors({ email: emailError || undefined, password: passwordError || undefined });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await login({ email, password }, isBusiness ? 'business' : 'user');
      // Auth gate in root layout will handle navigation
    } catch (error) {
      Alert.alert('Login Failed', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <FluttrLogo size={72} style={{ marginBottom: 16 }} />
            <Text style={styles.title}>Welcome back!</Text>
            <Text style={styles.subtitle}>
              Sign in to your {isBusiness ? 'business' : ''} account
            </Text>
          </View>

          {/* Account type toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, !isBusiness && styles.toggleActive]}
              onPress={() => setIsBusiness(false)}
            >
              <Text style={[styles.toggleText, !isBusiness && styles.toggleTextActive]}>
                👤 User
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, isBusiness && styles.toggleActive]}
              onPress={() => setIsBusiness(true)}
            >
              <Text style={[styles.toggleText, isBusiness && styles.toggleTextActive]}>
                🏪 Business
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              icon="📧"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <Input
              label="Password"
              icon="🔒"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? '🙈' : '👁️'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              error={errors.password}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
            />
          </View>

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isBusiness ? "Don't have a business account? " : "New to Fluttrr? "}
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push(
                  isBusiness ? '/(auth)/register-business' : '/(auth)/register',
                )
              }
            >
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 3,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: Colors.blue,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.textWhite,
  },
  form: {
    marginBottom: 24,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.blue,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  linkText: {
    fontSize: 14,
    color: Colors.blue,
    fontWeight: '600',
  },
});
