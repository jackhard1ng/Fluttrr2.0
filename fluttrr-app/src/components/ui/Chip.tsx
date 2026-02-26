import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  emoji?: string;
  style?: ViewStyle;
}

export function Chip({
  label,
  selected = false,
  onPress,
  color = Colors.blue,
  emoji,
  style,
}: ChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        selected
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: 'transparent', borderColor: Colors.border },
        style,
      ]}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text
        style={[
          styles.text,
          { color: selected ? Colors.textWhite : Colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  emoji: {
    fontSize: 14,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
