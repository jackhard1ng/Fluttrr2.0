import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'surface' | 'bordered';
}

export function Card({ children, onPress, style, variant = 'default' }: CardProps) {
  const cardStyles = [
    styles.base,
    variant === 'surface' && styles.surface,
    variant === 'bordered' && styles.bordered,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={cardStyles}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  surface: {
    backgroundColor: Colors.card,
  },
  bordered: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.blue,
  },
});
