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
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuthStore } from '@/stores/auth.store';
import {
  validateEmail,
  validatePassword,
  validateBusinessName,
  validateAddress,
} from '@/utils/validation';
import { extractErrorMessage } from '@/utils/error';

export default function RegisterBusinessScreen() {
  const router = useRouter();
  const registerBusiness = useAuthStore((s) => s.registerBusiness);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const handleRegister = async () => {
    const newErrors: Record<string, string | undefined> = {
      email: validateEmail(email) || undefined,
      password: validatePassword(password) || undefined,
      businessName: validateBusinessName(businessName) || undefined,
      address: validateAddress(address) || undefined,
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
      await registerBusiness({
        email,
        password,
        businessName,
        address,
        description: description || undefined,
        phone: phone || undefined,
        website: website || undefined,
      });
    } catch (error) {
      Alert.alert('Registration Failed', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="List Your Business" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerEmoji}>🎉</Text>
            <Text style={styles.infoBannerText}>
              Free during our Kansas City launch! Reach people actively looking for things to do.
            </Text>
          </View>

          <Input
            label="Business Name *"
            icon="🏪"
            placeholder="Your business name"
            value={businessName}
            onChangeText={setBusinessName}
            error={errors.businessName}
          />

          <Input
            label="Email *"
            icon="📧"
            placeholder="business@email.com"
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
            label="Address *"
            icon="📍"
            placeholder="123 Main St, Kansas City, MO"
            value={address}
            onChangeText={setAddress}
            error={errors.address}
          />

          <Input
            label="Description"
            icon="✏️"
            placeholder="Tell people about your business"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Input
            label="Phone"
            icon="📞"
            placeholder="(555) 123-4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Input
            label="Website"
            icon="🌐"
            placeholder="https://yourbusiness.com"
            value={website}
            onChangeText={setWebsite}
            keyboardType="url"
            autoCapitalize="none"
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
            title="Create Business Account"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have a business account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login?type=business')}
            >
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue + '11',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.blue + '33',
  },
  infoBannerEmoji: {
    fontSize: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.blue,
    lineHeight: 18,
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
