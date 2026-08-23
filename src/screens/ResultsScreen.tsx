// src/screens/ResultsScreen.tsx
// Screen for displaying prediction results

import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Share,
} from 'react-native';
import {ProbabilityGauge, DashboardCard, Button} from '../components';
import {colors, spacing, typography, borderRadius, shadows} from '../styles';
import {useAppSelector} from '../redux/hooks';
import {predictionService} from '../services/predictionService';

interface ResultsScreenProps {
  navigation: any;
  route: any;
}

interface Factor {
  factor: string;
  impact: number;
  direction: 'positive' | 'negative';
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({navigation, route}) => {
  const {scenarioId, isNew} = route.params || {};
  const [factors, setFactors] = useState<Factor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const scenario = useAppSelector(state =>
    state.scenarios.scenarios.find(s => s.id === scenarioId),
  );

  // Declared before the effect and memoised on `scenario`, so the dependency
  // array can name it honestly instead of omitting it.
  const loadFactors = useCallback(async () => {
    if (!scenario) {
      return;
    }

    try {
      const analysisFactors = await predictionService.analyzeFactors(scenario);
      setFactors(analysisFactors);
    } catch (error) {
      console.error('Error loading factors:', error);
    } finally {
      setIsLoading(false);
    }
  }, [scenario]);

  useEffect(() => {
    if (scenario) {
      loadFactors();
    }
  }, [scenario, loadFactors]);

  const handleShare = async () => {
    if (!scenario) return;

    try {
      await Share.share({
        message: `PREDICTIQ Prediction Result\n\nScenario: ${scenario.title}\nSuccess Probability: ${scenario.probability}%\n\nPowered by PREDICTIQ`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!scenario) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Scenario not found</Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  const positiveFactors = factors.filter(f => f.direction === 'positive');
  const negativeFactors = factors.filter(f => f.direction === 'negative');
  const netImpact = factors.reduce(
    (sum, f) => sum + (f.direction === 'positive' ? f.impact : -f.impact),
    0,
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Badge for new scenarios */}
        {isNew && (
          <View style={styles.successBadge}>
            <Text style={styles.successText}>✓ Prediction Complete</Text>
          </View>
        )}

        {/* Main Result */}
        <View style={styles.resultCard}>
          <Text style={styles.scenarioTitle}>{scenario.title}</Text>
          <Text style={styles.categoryBadge}>{scenario.category}</Text>

          <View style={styles.gaugeWrapper}>
            <ProbabilityGauge
              probability={scenario.probability}
              size={200}
              label="Success Probability"
            />
          </View>
        </View>

        {/* Factor Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Factor Analysis</Text>

          {isLoading && (
            <ActivityIndicator
              color={colors.primary.main}
              style={styles.factorsLoading}
            />
          )}

          <View style={styles.factorsContainer}>
            {/* Positive Factors */}
            <View style={styles.factorColumn}>
              <Text
                style={[
                  styles.factorColumnTitle,
                  {color: colors.success.high},
                ]}>
                Positive Factors
              </Text>
              {positiveFactors.map((factor, index) => (
                <View key={index} style={styles.factorItem}>
                  <Text style={styles.factorName}>{factor.factor}</Text>
                  <Text
                    style={[styles.factorImpact, {color: colors.success.high}]}>
                    +{factor.impact}%
                  </Text>
                </View>
              ))}
            </View>

            {/* Negative Factors */}
            <View style={styles.factorColumn}>
              <Text
                style={[styles.factorColumnTitle, {color: colors.danger.high}]}>
                Risk Factors
              </Text>
              {negativeFactors.map((factor, index) => (
                <View key={index} style={styles.factorItem}>
                  <Text style={styles.factorName}>{factor.factor}</Text>
                  <Text
                    style={[styles.factorImpact, {color: colors.danger.high}]}>
                    {factor.impact}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Net Impact */}
          <View style={styles.netImpactCard}>
            <Text style={styles.netImpactLabel}>Net Impact</Text>
            <Text
              style={[
                styles.netImpactValue,
                {
                  color:
                    netImpact >= 0 ? colors.success.high : colors.danger.high,
                },
              ]}>
              {netImpact >= 0 ? '+' : ''}
              {netImpact}%
            </Text>
          </View>
        </View>

        {/* Parameters Used */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parameters</Text>
          <View style={styles.parametersGrid}>
            <DashboardCard
              title="Confidence"
              value={`${scenario.parameters.confidence}%`}
              style={styles.paramCard}
            />
            <DashboardCard
              title="Risk Level"
              value={`${scenario.parameters.risk}%`}
              style={styles.paramCard}
            />
            <DashboardCard
              title="Experience"
              value={`${scenario.parameters.experience}yr`}
              style={styles.paramCard}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Share Results"
            onPress={handleShare}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title="New Scenario"
            onPress={() => navigation.navigate('NewScenario')}
            variant="primary"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  factorsLoading: {
    marginVertical: spacing.md,
  },
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  successBadge: {
    backgroundColor: colors.success.high + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  successText: {
    color: colors.success.high,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
  resultCard: {
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    ...shadows.lg,
    marginBottom: spacing.xl,
  },
  scenarioTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.light.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primary.main + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    color: colors.primary.main,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  gaugeWrapper: {
    marginVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.light.textPrimary,
    marginBottom: spacing.md,
  },
  factorsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  factorColumn: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  factorColumnTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  factorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  factorName: {
    fontSize: typography.fontSize.sm,
    color: colors.light.textPrimary,
    flex: 1,
  },
  factorImpact: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  netImpactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  netImpactLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.light.textPrimary,
  },
  netImpactValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  parametersGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paramCard: {
    flex: 1,
    padding: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.light.textSecondary,
    marginBottom: spacing.lg,
  },
});

export default ResultsScreen;
