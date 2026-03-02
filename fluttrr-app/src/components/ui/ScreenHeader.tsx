import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  showBack = false,
  rightAction,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={[styles.container, style]}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {rightAction ? (
        <View style={styles.rightAction}>{rightAction}</View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 44,
  },
  backButton: {
    width: 28,
    alignItems: 'flex-start',
  },
  backText: {
    fontSize: 28,
    color: Colors.blue,
    lineHeight: 28,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: Layout.fontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  spacer: {
    width: 28,
  },
  rightAction: {
    minWidth: 28,
    alignItems: 'flex-end',
  },
});
