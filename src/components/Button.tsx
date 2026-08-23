// src/components/Button.tsx
// Reusable button component with variants

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : colors.primary.main}
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary.main,
  },
  secondary: {
    backgroundColor: colors.light.surfaceAlt,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary.main,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  smallSize: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mediumSize: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  largeSize: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },

  // Text styles
  text: {
    fontWeight: typography.fontWeight.semibold,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: colors.light.textPrimary,
  },
  outlineText: {
    color: colors.primary.main,
  },
  ghostText: {
    color: colors.primary.main,
  },

  // Text sizes
  smallText: {
    fontSize: typography.fontSize.sm,
  },
  mediumText: {
    fontSize: typography.fontSize.md,
  },
  largeText: {
    fontSize: typography.fontSize.lg,
  },

  disabledText: {
    color: colors.light.textMuted,
  },
});

export default Button;
