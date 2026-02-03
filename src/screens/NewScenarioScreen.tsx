// src/screens/NewScenarioScreen.tsx
// Screen for creating new prediction scenarios

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TextInput,
    Alert,
} from 'react-native';
import { Button } from '../components';
import { colors, spacing, typography, borderRadius, shadows } from '../styles';
import { useAppDispatch } from '../redux/hooks';
import { addScenario } from '../redux/slices/scenarioSlice';
import predictionService from '../services/predictionService';

interface NewScenarioScreenProps {
    navigation: any;
}

const CATEGORIES = ['Business', 'Personal', 'Finance', 'Health', 'Education', 'Other'];

const NewScenarioScreen: React.FC<NewScenarioScreenProps> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Business',
        confidence: 50,
        risk: 30,
        experience: 5,
        preparation: true,
    });

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            Alert.alert('Error', 'Please enter a scenario title');
            return;
        }

        setIsLoading(true);

        try {
            // Calculate probability using the prediction service
            const probability = await predictionService.calculateProbability({
                confidence: formData.confidence,
                risk: formData.risk,
                experience: formData.experience,
                preparation: formData.preparation,
            });

            const newScenario = {
                id: `scenario_${Date.now()}`,
                title: formData.title,
                description: formData.description,
                category: formData.category,
                parameters: {
                    confidence: formData.confidence,
                    risk: formData.risk,
                    experience: formData.experience,
                    preparation: formData.preparation,
                },
                probability,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            dispatch(addScenario(newScenario));
            navigation.navigate('Results', { scenarioId: newScenario.id, isNew: true });
        } catch (error) {
            Alert.alert('Error', 'Failed to create scenario. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Title Input */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Scenario Title *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.title}
                        onChangeText={(text) => setFormData({ ...formData, title: text })}
                        placeholder="e.g., Product Launch Q1 2025"
                        placeholderTextColor={colors.light.textMuted}
                    />
                </View>

                {/* Description Input */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        placeholder="Describe the scenario you want to predict..."
                        placeholderTextColor={colors.light.textMuted}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Category Selection */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((cat) => (
                            <Button
                                key={cat}
                                title={cat}
                                variant={formData.category === cat ? 'primary' : 'outline'}
                                size="small"
                                onPress={() => setFormData({ ...formData, category: cat })}
                                style={styles.categoryButton}
                            />
                        ))}
                    </View>
                </View>

                {/* Parameters Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Prediction Parameters</Text>

                    {/* Confidence Slider */}
                    <View style={styles.parameterGroup}>
                        <View style={styles.parameterHeader}>
                            <Text style={styles.parameterLabel}>Confidence Level</Text>
                            <Text style={styles.parameterValue}>{formData.confidence}%</Text>
                        </View>
                        <View style={styles.sliderContainer}>
                            <TextInput
                                style={styles.sliderInput}
                                value={formData.confidence.toString()}
                                onChangeText={(text) => {
                                    const num = parseInt(text) || 0;
                                    setFormData({ ...formData, confidence: Math.min(100, Math.max(0, num)) });
                                }}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        </View>
                    </View>

                    {/* Risk Level */}
                    <View style={styles.parameterGroup}>
                        <View style={styles.parameterHeader}>
                            <Text style={styles.parameterLabel}>Risk Level</Text>
                            <Text style={styles.parameterValue}>{formData.risk}%</Text>
                        </View>
                        <View style={styles.sliderContainer}>
                            <TextInput
                                style={styles.sliderInput}
                                value={formData.risk.toString()}
                                onChangeText={(text) => {
                                    const num = parseInt(text) || 0;
                                    setFormData({ ...formData, risk: Math.min(100, Math.max(0, num)) });
                                }}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        </View>
                    </View>

                    {/* Experience Years */}
                    <View style={styles.parameterGroup}>
                        <View style={styles.parameterHeader}>
                            <Text style={styles.parameterLabel}>Years of Experience</Text>
                            <Text style={styles.parameterValue}>{formData.experience} years</Text>
                        </View>
                        <View style={styles.sliderContainer}>
                            <TextInput
                                style={styles.sliderInput}
                                value={formData.experience.toString()}
                                onChangeText={(text) => {
                                    const num = parseInt(text) || 0;
                                    setFormData({ ...formData, experience: Math.min(50, Math.max(0, num)) });
                                }}
                                keyboardType="numeric"
                                maxLength={2}
                            />
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <Button
                    title="Calculate Probability"
                    onPress={handleSubmit}
                    variant="primary"
                    size="large"
                    loading={isLoading}
                    fullWidth
                />
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
    },
    inputGroup: {
        marginBottom: spacing.xl,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.light.textSecondary,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: colors.light.surface,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        fontSize: typography.fontSize.md,
        color: colors.light.textPrimary,
        borderWidth: 1,
        borderColor: colors.light.border,
    },
    textArea: {
        minHeight: 100,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    categoryButton: {
        minWidth: 80,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.light.textPrimary,
        marginBottom: spacing.lg,
    },
    parameterGroup: {
        backgroundColor: colors.light.surface,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },
    parameterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    parameterLabel: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.medium,
        color: colors.light.textPrimary,
    },
    parameterValue: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary.main,
    },
    sliderContainer: {
        marginTop: spacing.sm,
    },
    sliderInput: {
        backgroundColor: colors.light.surfaceAlt,
        borderRadius: borderRadius.sm,
        padding: spacing.md,
        fontSize: typography.fontSize.lg,
        color: colors.light.textPrimary,
        textAlign: 'center',
        width: 80,
    },
});

export default NewScenarioScreen;
