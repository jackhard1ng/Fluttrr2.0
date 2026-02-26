import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.profileCard}>
          <Text style={styles.avatar}>👤</Text>
          <Text style={styles.name}>{user?.displayName || 'User'}</Text>
          <Text style={styles.username}>@{user?.username || 'username'}</Text>
          {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
        </View>

        <Button
          title="Sign Out"
          onPress={logout}
          variant="danger"
          style={{ marginTop: 32 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.blue,
  },
  avatar: { fontSize: 64, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '700', color: Colors.text },
  username: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  bio: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
