import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface BadgeProps {
  label: string;
  color?: string;
  style?: ViewStyle;
}

// Colored pill badge (like `BG` in the prototype)
export function Badge({ label, color = Colors.blue, style }: BadgeProps) {
  return (
    <View style={[styles.container, { backgroundColor: color + '22' }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

// Small count badge (notification dot / unread count)
interface CountBadgeProps {
  count?: number;
  style?: ViewStyle;
}

export function CountBadge({ count, style }: CountBadgeProps) {
  if (count !== undefined && count <= 0) return null;

  return (
    <View style={[styles.countContainer, style]}>
      {count !== undefined ? (
        <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
      ) : null}
    </View>
  );
}

// Status dot (8px colored circle)
interface StatusDotProps {
  color?: string;
  size?: number;
  style?: ViewStyle;
}

export function StatusDot({ color = Colors.error, size = 8, style }: StatusDotProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  countContainer: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
