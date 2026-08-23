// src/components/DashboardCard.tsx
// Reusable card component for displaying KPIs

import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors, spacing, borderRadius, shadows, typography} from '../styles';
import {getTrendColor} from '../styles/colors';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: string;
  style?: ViewStyle;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color = colors.primary.main,
  style,
}) => {
  const trendColor = trend ? getTrendColor(trend) : undefined;
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
      </View>

      <View style={styles.content}>
        <Text style={[styles.value, {color}]}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {trend && trendValue && (
        <View style={styles.trendContainer}>
          <Text style={[styles.trendIcon, {color: trendColor}]}>
            {trendIcon}
          </Text>
          <Text style={[styles.trendValue, {color: trendColor}]}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.light.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.light.textMuted,
    marginTop: spacing.xs,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  trendIcon: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing.xs,
  },
  trendValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});

export default DashboardCard;
