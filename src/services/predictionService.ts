// src/services/predictionService.ts
// Mock prediction service (can be connected to real API later)

import { Scenario } from '../redux/slices/scenarioSlice';

// Simulated prediction model
// In a real app, this would call an AI/ML backend API
export const predictionService = {
    /**
     * Calculate probability for a given scenario
     * This is a mock implementation - replace with actual API call
     */
    async calculateProbability(
        parameters: Record<string, number | string | boolean>
    ): Promise<number> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock calculation based on parameters
        let baseProbability = 50;

        // Adjust based on common parameters
        if (parameters.confidence && typeof parameters.confidence === 'number') {
            baseProbability += (parameters.confidence - 50) * 0.3;
        }

        if (parameters.risk && typeof parameters.risk === 'number') {
            baseProbability -= parameters.risk * 0.2;
        }

        if (parameters.preparation && typeof parameters.preparation === 'boolean') {
            baseProbability += parameters.preparation ? 10 : -5;
        }

        if (parameters.experience && typeof parameters.experience === 'number') {
            baseProbability += parameters.experience * 2;
        }

        // Add some randomness for demo purposes
        baseProbability += (Math.random() - 0.5) * 10;

        // Clamp between 0 and 100
        return Math.min(100, Math.max(0, Math.round(baseProbability)));
    },

    /**
     * Analyze factors contributing to the probability
     */
    async analyzeFactors(
        scenario: Scenario
    ): Promise<{ factor: string; impact: number; direction: 'positive' | 'negative' }[]> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock factor analysis
        return [
            { factor: 'Market Conditions', impact: 15, direction: 'positive' },
            { factor: 'Resource Availability', impact: 10, direction: 'positive' },
            { factor: 'Competition', impact: -8, direction: 'negative' },
            { factor: 'Timing', impact: 5, direction: 'positive' },
            { factor: 'Risk Exposure', impact: -12, direction: 'negative' },
        ];
    },

    /**
     * Get historical predictions for comparison
     */
    async getHistoricalData(
        category: string,
        limit: number = 10
    ): Promise<{ date: string; probability: number }[]> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Mock historical data
        const data = [];
        const now = new Date();

        for (let i = limit - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i * 7);
            data.push({
                date: date.toISOString().split('T')[0],
                probability: Math.round(40 + Math.random() * 40),
            });
        }

        return data;
    },
};

export default predictionService;
