import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  small?: boolean;
  full?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  small = false,
  full = true,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyles: ViewStyle[] = [
    styles.base,
    small ? styles.small : styles.normal,
    full && styles.full,
    variantStyles[variant].container,
    isDisabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    small && styles.textSmall,
    variantStyles[variant].text,
    textStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={containerStyles}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'outline' || variant === 'ghost'
            ? Colors.blue
            : Colors.textWhite}
        />
      ) : (
        <>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Layout.radius.lg,
    gap: 8,
  },
  normal: {
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  small: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  full: {
    width: '100%',
  },
  text: {
    fontSize: Layout.fontSize.md,
    fontWeight: Layout.fontWeight.semibold,
  },
  textSmall: {
    fontSize: Layout.fontSize.sm,
  },
  icon: {
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: Colors.blue },
    text: { color: Colors.textWhite },
  },
  secondary: {
    container: {
      backgroundColor: Colors.surface,
      borderWidth: 1.5,
      borderColor: Colors.border,
    },
    text: { color: Colors.text },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.blue,
    },
    text: { color: Colors.blue },
  },
  danger: {
    container: { backgroundColor: Colors.error },
    text: { color: Colors.textWhite },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: Colors.blue },
  },
};
