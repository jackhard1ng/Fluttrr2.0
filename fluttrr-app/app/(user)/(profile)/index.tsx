import React, { useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';
import { usersApi } from '@/api/users';
import { extractErrorMessage } from '@/utils/error';
import { Config } from '@/constants/config';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await usersApi.updateMe({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
      });
      setUser(data);
      setEditing(false);
      Alert.alert('Saved', 'Profile updated!');
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => router.push('/(user)/(profile)/edit')}>
          <Text style={styles.editBtn}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Profile card */}
        <Card variant="bordered" style={styles.profileCard}>
          <Avatar uri={user?.profilePhoto} size={80} ring={Colors.blue} />
          {!editing ? (
            <>
              <Text style={styles.name}>{user?.displayName}</Text>
              <Text style={styles.username}>@{user?.username}</Text>
              {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
              {user?.city && (
                <Text style={styles.city}>📍 {user.city}</Text>
              )}
              {user?.emailVerified && (
                <Text style={styles.verified}>✅ Email verified</Text>
              )}
            </>
          ) : (
            <View style={styles.editForm}>
              <Input
                label="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
              />
              <Input
                label={`Bio (${bio.length}/${Config.MAX_BIO_LENGTH})`}
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={Config.MAX_BIO_LENGTH}
              />
              <Input
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Kansas City"
              />
              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setEditing(false);
                    setDisplayName(user?.displayName || '');
                    setBio(user?.bio || '');
                    setCity(user?.city || '');
                  }}
                  variant="secondary"
                  small
                  full={false}
                />
                <Button
                  title="Save"
                  onPress={handleSave}
                  loading={saving}
                  small
                  full={false}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Quick stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user?.email}</Text>
              <Text style={styles.statLabel}>Email</Text>
            </View>
          </View>
        </Card>

        {/* Menu items */}
        <Card style={styles.menuCard}>
          <MenuItem emoji="🎉" label="My Events" onPress={() => router.push('/(user)/(profile)/my-events')} />
          <MenuItem emoji="🔔" label="Notifications" onPress={() => router.push('/(user)/(home)/notifications')} />
          <MenuItem emoji="⚙️" label="Settings" onPress={() => router.push('/(user)/(profile)/settings')} />
          <MenuItem emoji="❓" label="Help & FAQ" onPress={() => router.push('/(user)/(profile)/help')} />
        </Card>

        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="danger"
          style={{ marginTop: 16 }}
        />

        <Text style={styles.version}>Fluttrr v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={menuStyles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={menuStyles.emoji}>{emoji}</Text>
      <Text style={menuStyles.label}>{label}</Text>
      <Text style={menuStyles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  arrow: {
    fontSize: 18,
    color: Colors.textMuted,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  editBtn: {
    fontSize: 15,
    color: Colors.blue,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  username: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  city: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
  },
  verified: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 6,
  },
  editForm: {
    width: '100%',
    marginTop: 16,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuCard: {
    marginBottom: 16,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 16,
  },
});
