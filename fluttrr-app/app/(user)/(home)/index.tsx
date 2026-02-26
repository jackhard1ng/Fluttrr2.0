import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🦋 fluttrr</Text>
        <Text style={styles.bell}>🔔</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.greeting}>
          Hey{user?.displayName ? `, ${user.displayName}` : ''}! 👋
        </Text>
        <Text style={styles.subtitle}>
          Discover what's happening in Kansas City
        </Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>🎉</Text>
          <Text style={styles.placeholderText}>
            Event feed coming in Phase 3
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  bell: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
