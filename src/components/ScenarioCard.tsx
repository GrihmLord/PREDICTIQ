// src/components/ScenarioCard.tsx
// Card component for displaying scenario summaries

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {colors, spacing, borderRadius, shadows, typography} from '../styles';
import {getProbabilityColor} from '../styles/colors';

interface ScenarioCardProps {
  id: string;
  title: string;
  description?: string;
  probability: number;
  createdAt: string;
  category?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  id,
  title,
  description,
  probability,
  createdAt,
  category,
  onPress,
  style,
}) => {
  const probabilityColor = getProbabilityColor(probability);

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          )}
        </View>
        <View
          style={[
            styles.probabilityBadge,
            {backgroundColor: probabilityColor + '20'},
          ]}>
          <Text style={[styles.probabilityText, {color: probabilityColor}]}>
            {probability}%
          </Text>
        </View>
      </View>

      {description && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.date}>{createdAt}</Text>
        <Text style={styles.idText}>#{id.slice(-6)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.light.textPrimary,
  },
  categoryBadge: {
    backgroundColor: colors.primary.main + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.medium,
  },
  probabilityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  probabilityText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.light.textSecondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.sm,
  },
  date: {
    fontSize: typography.fontSize.xs,
    color: colors.light.textMuted,
  },
  idText: {
    fontSize: typography.fontSize.xs,
    color: colors.light.textMuted,
    fontFamily: 'monospace',
  },
});

export default ScenarioCard;
