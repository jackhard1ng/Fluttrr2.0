import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface SpotsLabelProps {
  spotsLeft: number | null;
  size?: 'sm' | 'md';
}

export function SpotsLabel({ spotsLeft, size = 'sm' }: SpotsLabelProps) {
  if (spotsLeft === null) {
    return (
      <Text style={[styles.base, size === 'md' && styles.md, { color: Colors.cyan }]}>
        Open
      </Text>
    );
  }

  if (spotsLeft <= 0) {
    return (
      <Text style={[styles.base, size === 'md' && styles.md, { color: Colors.error }]}>
        Full
      </Text>
    );
  }

  const color = spotsLeft <= 5 ? Colors.warn : Colors.success;
  return (
    <Text style={[styles.base, size === 'md' && styles.md, { color }]}>
      {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 12,
    fontWeight: '600',
  },
  md: {
    fontSize: 14,
  },
});
