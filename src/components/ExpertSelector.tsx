import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ExpertDefinition } from '../services/ExpertVectorService';
import { colors } from '../styles/colors';

interface ExpertSelectorProps {
    experts: ExpertDefinition[];
    selectedIds: string[];
    onToggle: (id: string) => void;
}

export const ExpertSelector: React.FC<ExpertSelectorProps> = ({ experts, selectedIds, onToggle }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>SELECT COUNCIL MEMBERS</Text>
            <Text style={styles.subtitle}>Choose 3-5 experts for risk assessment</Text>

            <View style={styles.grid}>
                {experts.map((expert) => {
                    const isSelected = selectedIds.includes(expert.id);
                    return (
                        <TouchableOpacity
                            key={expert.id}
                            style={[
                                styles.card,
                                isSelected && styles.selectedCard
                            ]}
                            onPress={() => onToggle(expert.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.avatar, isSelected && styles.selectedAvatar]}>
                                <Text style={[styles.avatarText, isSelected && styles.selectedAvatarText]}>
                                    {expert.name.substring(0, 2).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.info}>
                                <Text style={styles.expertName}>{expert.name}</Text>
                                <Text style={styles.expertSpecialty}>{expert.domain}</Text>
                                <Text style={styles.clearance} numberOfLines={1}>
                                    Target: {expert.focusKeywords.slice(0, 2).join(', ')}...
                                </Text>
                            </View>
                            {isSelected && (
                                <View style={styles.checkIndicator}>
                                    <Text style={styles.checkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    title: {
        color: colors.dark.border, // Using border color for subtle headers or muted text if preferred.
        // Wait, title should be more visible. Let's use textPrimary or border for "SELECT COUNCIL MEMBERS" logic.
        // Actually original was #E2E8F0 (lighter). Let's use textPrimary.
        color: colors.dark.textPrimary,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: 1,
    },
    subtitle: {
        color: colors.dark.textSecondary,
        fontSize: 12,
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    card: {
        width: '48%', // Approx 2 columns
        backgroundColor: colors.dark.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.dark.surfaceAlt,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedCard: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)', // Primary tint
        borderColor: colors.primary.main,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.dark.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    selectedAvatar: {
        backgroundColor: colors.primary.main,
    },
    avatarText: {
        color: colors.dark.textMuted,
        fontSize: 12,
        fontWeight: 'bold',
    },
    selectedAvatarText: {
        color: '#FFF',
    },
    info: {
        flex: 1,
    },
    expertName: {
        color: colors.dark.textPrimary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    expertSpecialty: {
        color: colors.dark.textSecondary,
        fontSize: 10,
        marginBottom: 2,
    },
    clearance: {
        color: colors.danger.high,
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    checkIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    checkText: {
        color: colors.primary.main,
        fontSize: 12,
        fontWeight: 'bold',
    }
});
