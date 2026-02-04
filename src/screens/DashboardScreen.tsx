// src/screens/DashboardScreen.tsx
// Main dashboard screen with KPIs and recent predictions

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { DashboardCard, ProbabilityGauge, ScenarioCard, Button } from '../components';
import { colors, spacing, typography, borderRadius, shadows } from '../styles';
import { useAppSelector } from '../redux/hooks';
import predictionService from '../services/predictionService';

interface DashboardScreenProps {
    navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
    const [refreshing, setRefreshing] = useState(false);
    const [latestProbability, setLatestProbability] = useState(72);
    const [historicalData, setHistoricalData] = useState<{ date: string; probability: number }[]>([]);

    const scenarios = useAppSelector(state => state.scenarios.scenarios);
    const recentScenarios = scenarios.slice(0, 3);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const history = await predictionService.getHistoricalData('general', 7);
            setHistoricalData(history);
            if (history.length > 0) {
                setLatestProbability(history[history.length - 1].probability);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const averageProbability = historicalData.length > 0
        ? Math.round(historicalData.reduce((sum, d) => sum + d.probability, 0) / historicalData.length)
        : 0;

    const trend = latestProbability > averageProbability ? 'up' : latestProbability < averageProbability ? 'down' : 'flat';

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Welcome back!</Text>
                        <Text style={styles.title}>PREDICTIQ Dashboard</Text>
                    </View>
                </View>

                {/* Main Probability Gauge */}
                <View style={styles.gaugeContainer}>
                    <ProbabilityGauge
                        probability={latestProbability}
                        size={180}
                        label="Overall Success Probability"
                    />
                </View>

                {/* Quick Stats Row */}
                <View style={styles.statsRow}>
                    <DashboardCard
                        title="Scenarios"
                        value={scenarios.length.toString()}
                        subtitle="Total created"
                        style={styles.statCard}
                    />
                    <DashboardCard
                        title="Avg. Success"
                        value={`${averageProbability}%`}
                        trend={trend}
                        trendValue={`${Math.abs(latestProbability - averageProbability)}%`}
                        style={styles.statCard}
                    />
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionButtons}>
                        <Button
                            title="New Scenario"
                            onPress={() => navigation.navigate('NewScenario')}
                            variant="primary"
                            style={styles.actionButton}
                        />
                        <Button
                            title="View History"
                            onPress={() => navigation.navigate('History')}
                            variant="outline"
                            style={styles.actionButton}
                        />
                    </View>
                </View>

                {/* Recent Scenarios */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Scenarios</Text>
                        {scenarios.length > 3 && (
                            <TouchableOpacity onPress={() => navigation.navigate('History')}>
                                <Text style={styles.seeAllLink}>See All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {recentScenarios.length > 0 ? (
                        recentScenarios.map(scenario => (
                            <ScenarioCard
                                key={scenario.id}
                                id={scenario.id}
                                title={scenario.title}
                                description={scenario.description}
                                probability={scenario.probability}
                                createdAt={new Date(scenario.createdAt).toLocaleDateString()}
                                category={scenario.category}
                                onPress={() => navigation.navigate('Results', { scenarioId: scenario.id })}
                                style={styles.scenarioCard}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No scenarios yet</Text>
                            <Text style={styles.emptySubtext}>
                                Create your first scenario to get started
                            </Text>
                            <Button
                                title="Create Scenario"
                                onPress={() => navigation.navigate('NewScenario')}
                                variant="primary"
                                size="small"
                                style={{ marginTop: spacing.md }}
                            />
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.light.background,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing['4xl'],
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    greeting: {
        fontSize: typography.fontSize.md,
        color: colors.light.textSecondary,
    },
    title: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.light.textPrimary,
        marginTop: spacing.xs,
    },
    gaugeContainer: {
        alignItems: 'center',
        backgroundColor: colors.light.surface,
        borderRadius: borderRadius.xl,
        padding: spacing['2xl'],
        marginBottom: spacing.xl,
        ...shadows.md,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    statCard: {
        flex: 1,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.light.textPrimary,
        marginBottom: spacing.md,
    },
    seeAllLink: {
        fontSize: typography.fontSize.sm,
        color: colors.primary.main,
        fontWeight: typography.fontWeight.medium,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    actionButton: {
        flex: 1,
    },
    scenarioCard: {
        marginBottom: spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing['2xl'],
        backgroundColor: colors.light.surface,
        borderRadius: borderRadius.lg,
        ...shadows.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.medium,
        color: colors.light.textPrimary,
    },
    emptySubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.light.textSecondary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
});

export default DashboardScreen;
