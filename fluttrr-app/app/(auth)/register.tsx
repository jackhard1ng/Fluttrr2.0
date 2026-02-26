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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuthStore } from '@/stores/auth.store';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateDisplayName,
  validateProfilePhoto,
} from '@/utils/validation';
import { extractErrorMessage } from '@/utils/error';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
      setErrors((prev) => ({ ...prev, profilePhoto: undefined }));
    }
  };

  const handleRegister = async () => {
    const newErrors: Record<string, string | undefined> = {
      email: validateEmail(email) || undefined,
      password: validatePassword(password) || undefined,
      username: validateUsername(username) || undefined,
      displayName: validateDisplayName(displayName) || undefined,
      profilePhoto: validateProfilePhoto(profilePhoto) || undefined,
    };

    const hasErrors = Object.values(newErrors).some(Boolean);
    setErrors(newErrors);
    if (hasErrors) return;

    if (!agreed) {
      Alert.alert('Terms Required', 'Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      await register({
        email,
        password,
        username,
        displayName,
        profilePhoto: profilePhoto!,
        bio: bio || undefined,
        city: city || undefined,
      });
      // Auth store will set pendingOtpEmail, root layout will navigate to OTP screen
    } catch (error) {
      Alert.alert('Registration Failed', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Create Account" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Photo (Required) */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickImage} style={styles.photoButton}>
              {profilePhoto ? (
                <View style={styles.photoPreview}>
                  <Text style={styles.photoPreviewEmoji}>✅</Text>
                  <Text style={styles.photoPreviewText}>Photo selected</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.photoEmoji}>📷</Text>
                  <Text style={styles.photoLabel}>Add Photo *</Text>
                </>
              )}
            </TouchableOpacity>
            {errors.profilePhoto && (
              <Text style={styles.photoError}>{errors.profilePhoto}</Text>
            )}
          </View>

          {/* Form fields */}
          <Input
            label="Display Name *"
            icon="👤"
            placeholder="How you want to be known"
            value={displayName}
            onChangeText={setDisplayName}
            error={errors.displayName}
          />

          <Input
            label="Username *"
            icon="@"
            placeholder="Choose a unique username"
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.username}
          />

          <Input
            label="Email *"
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
            label="Password *"
            icon="🔒"
            placeholder="Min 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? '🙈' : '👁️'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            error={errors.password}
          />

          <Input
            label="Bio"
            icon="✏️"
            placeholder="Tell us about yourself (optional)"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
          />

          <Input
            label="City"
            icon="📍"
            placeholder="e.g. Kansas City"
            value={city}
            onChangeText={setCity}
          />

          {/* Terms checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreed(!agreed)}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.linkText}>Sign In</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.blue,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmoji: {
    fontSize: 28,
  },
  photoLabel: {
    fontSize: 10,
    color: Colors.blue,
    fontWeight: '600',
    marginTop: 2,
  },
  photoPreview: {
    alignItems: 'center',
  },
  photoPreviewEmoji: {
    fontSize: 28,
  },
  photoPreviewText: {
    fontSize: 9,
    color: Colors.success,
    marginTop: 2,
  },
  photoError: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  checkmark: {
    fontSize: 14,
    color: Colors.textWhite,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.blue,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
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
