import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuthStore } from '@/stores/auth.store';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function SettingsMenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.menuIcon}>{icon}</Text>
      <Text style={[s.menuLabel, danger && { color: Colors.error }]}>{label}</Text>
      {!danger && <Text style={s.menuArrow}>›</Text>}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Settings" showBack />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Account section */}
        <Text style={s.sectionTitle}>ACCOUNT</Text>
        <View style={s.menuGroup}>
          <SettingsMenuItem
            icon="👤"
            label="Edit Profile"
            onPress={() => router.push('/(user)/(profile)/edit')}
          />
          <SettingsMenuItem
            icon="🔒"
            label="Privacy"
            onPress={() => router.push('/(user)/(profile)/privacy')}
          />
          <SettingsMenuItem
            icon="🚫"
            label="Blocked"
            onPress={() => router.push('/(user)/(profile)/blocked-users')}
          />
        </View>

        {/* Support section */}
        <Text style={s.sectionTitle}>SUPPORT</Text>
        <View style={s.menuGroup}>
          <SettingsMenuItem
            icon="❓"
            label="Help & FAQ"
            onPress={() => router.push('/(user)/(profile)/help')}
          />
          <SettingsMenuItem
            icon="📧"
            label="Contact Us"
            onPress={() => Alert.alert('Contact', 'Email us at support@fluttrr.com')}
          />
        </View>

        {/* Danger zone */}
        <View style={[s.menuGroup, { marginTop: 24 }]}>
          <SettingsMenuItem
            icon="🚪"
            label="Log Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  menuIcon: { fontSize: 16 },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text },
  menuArrow: { fontSize: 18, color: Colors.textMuted },
});
