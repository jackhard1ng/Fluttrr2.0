import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: string;
  error?: string | null;
  containerStyle?: ViewStyle;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  icon,
  error,
  containerStyle,
  rightIcon,
  onRightIconPress,
  ...textInputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
          error && styles.containerError,
        ]}
      >
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textSecondary + '88'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...textInputProps}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress}>
            <Text style={styles.rightIcon}>{rightIcon}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: Layout.fontSize.sm,
    fontWeight: Layout.fontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  containerFocused: {
    borderColor: Colors.blue,
  },
  containerError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    padding: 0,
  },
  icon: {
    fontSize: 16,
    opacity: 0.5,
  },
  rightIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  error: {
    fontSize: Layout.fontSize.xs,
    color: Colors.error,
    marginTop: 4,
  },
});
