// src/components/ProbabilityGauge.tsx
// Circular gauge component for displaying success probability

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography } from '../styles';
import { getProbabilityColor } from '../styles/colors';

interface ProbabilityGaugeProps {
    probability: number; // 0-100
    size?: number;
    strokeWidth?: number;
    label?: string;
    showPercentage?: boolean;
}

const ProbabilityGauge: React.FC<ProbabilityGaugeProps> = ({
    probability,
    size = 160,
    strokeWidth = 12,
    label = 'Success Probability',
    showPercentage = true,
}) => {
    const clampedProbability = Math.min(100, Math.max(0, probability));
    const color = getProbabilityColor(clampedProbability);

    // Calculate dimensions
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (clampedProbability / 100) * circumference;
    const offset = circumference - progress;

    // Probability label based on value
    const getProbabilityLabel = (): string => {
        if (clampedProbability >= 80) return 'Very High';
        if (clampedProbability >= 60) return 'High';
        if (clampedProbability >= 40) return 'Moderate';
        if (clampedProbability >= 20) return 'Low';
        return 'Very Low';
    };

    return (
        <View style={styles.container}>
            <View style={[styles.gaugeContainer, { width: size, height: size }]}>
                {/* Background circle */}
                <View
                    style={[
                        styles.circle,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            borderWidth: strokeWidth,
                            borderColor: colors.light.surfaceAlt,
                        },
                    ]}
                />

                {/* Progress arc - using semi-circle approach with rotation */}
                <View
                    style={[
                        styles.progressContainer,
                        { width: size, height: size },
                    ]}
                >
                    {/* Left half */}
                    <View style={[styles.halfCircle, { width: size / 2, height: size }]}>
                        <View
                            style={[
                                styles.halfCircleInner,
                                {
                                    width: size,
                                    height: size,
                                    borderRadius: size / 2,
                                    borderWidth: strokeWidth,
                                    borderColor: color,
                                    borderRightColor: 'transparent',
                                    borderBottomColor: 'transparent',
                                    transform: [
                                        { rotate: `${clampedProbability > 50 ? 180 : (clampedProbability / 50) * 180}deg` },
                                    ],
                                },
                            ]}
                        />
                    </View>

                    {/* Right half - only visible when > 50% */}
                    {clampedProbability > 50 && (
                        <View style={[styles.halfCircle, styles.rightHalf, { width: size / 2, height: size }]}>
                            <View
                                style={[
                                    styles.halfCircleInner,
                                    {
                                        width: size,
                                        height: size,
                                        borderRadius: size / 2,
                                        borderWidth: strokeWidth,
                                        borderColor: color,
                                        borderLeftColor: 'transparent',
                                        borderTopColor: 'transparent',
                                        transform: [
                                            { rotate: `${((clampedProbability - 50) / 50) * 180}deg` },
                                        ],
                                    },
                                ]}
                            />
                        </View>
                    )}
                </View>

                {/* Center content */}
                <View style={styles.centerContent}>
                    {showPercentage && (
                        <Text style={[styles.percentageText, { color }]}>
                            {Math.round(clampedProbability)}%
                        </Text>
                    )}
                    <Text style={styles.probabilityLabel}>
                        {getProbabilityLabel()}
                    </Text>
                </View>
            </View>

            {label && <Text style={styles.label}>{label}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    gaugeContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    circle: {
        position: 'absolute',
    },
    progressContainer: {
        position: 'absolute',
        flexDirection: 'row',
    },
    halfCircle: {
        overflow: 'hidden',
    },
    rightHalf: {
        position: 'absolute',
        right: 0,
    },
    halfCircleInner: {
        position: 'absolute',
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    percentageText: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: typography.fontWeight.bold,
    },
    probabilityLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.light.textSecondary,
        marginTop: spacing.xs,
    },
    label: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.medium,
        color: colors.light.textPrimary,
        marginTop: spacing.md,
    },
});

export default ProbabilityGauge;
