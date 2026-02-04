// src/services/PredictionService.ts

export interface PredictionResult {
    id: string;
    scenario: string;
    probability: number; // 0-100
    confidence: number; // 0-100
    factors: { name: string; impact: 'positive' | 'negative'; weight: number }[];
    timestamp: Date;
    status: 'Verified' | 'Pending' | 'Draft';
    type: 'Financial' | 'Product' | 'Strategy' | 'Metric' | 'Geopolitical';

    // Global Risk Extensions
    defconLevel: number;
    expertConsensus: string;
    activeThreats: string[];
}

import { storageService } from './storageService';

class PredictionService {
    private async simulateDelay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async analyzeScenario(scenarioData: any): Promise<PredictionResult> {
        // 1. Get User Settings
        const settings = storageService.getSettings();
        const { riskSensitivity = 'Balanced', temperature = 0.7, analysisSpeed = 'Cinematic' } = settings;

        // 2. Handle Latency (Cinematic vs Instant)
        const delay = analysisSpeed === 'Instant' ? 50 : 2500;
        await this.simulateDelay(delay);

        // 3. Calculate Base Ranges based on Sensitivity
        // Conservative: Lower probability of high risk
        // Aggressive: Higher probability of high risk
        let minRisk = 60;
        let maxRisk = 95;

        if (riskSensitivity === 'Conservative') {
            minRisk = 40;
            maxRisk = 75;
        } else if (riskSensitivity === 'Aggressive') {
            minRisk = 75;
            maxRisk = 99;
        }

        // 4. Apply Temperature (Variance)
        // High temp = wider variance, Low temp = strictly clustered
        const variance = (Math.random() - 0.5) * 2 * (temperature * 20); // +/- 0 to 20 based on temp

        let probability = Math.floor(Math.random() * (maxRisk - minRisk) + minRisk + variance);
        probability = Math.max(0, Math.min(100, probability)); // Clamp 0-100

        // Confidence also affected by temperature (Inverse: High temp = Lower confidence stability)
        const confidenceBase = 85;
        const confidenceVariance = (1.0 - temperature) * 10; // Low temp = high stability
        const confidence = Math.floor(confidenceBase + (Math.random() * confidenceVariance));

        return {
            id: Date.now().toString(),
            scenario: scenarioData.title || 'New Analysis',
            probability,
            confidence: Math.max(0, Math.min(100, confidence)),
            factors: [
                { name: 'Market Growth', impact: 'positive', weight: 85 },
                { name: 'Competitor Saturation', impact: 'negative', weight: 45 },
                { name: 'Regulatory Compliance', impact: 'positive', weight: 70 },
            ],
            timestamp: new Date(),
            status: 'Verified',
            type: 'Strategy',
            defconLevel: this.calculateDefcon(probability),
            expertConsensus: this.generateConsensus(riskSensitivity),
            activeThreats: ['Market Volatility', 'Supply Chain']
        };
    }

    private calculateDefcon(prob: number): number {
        if (prob > 90) return 1;
        if (prob > 75) return 2;
        if (prob > 50) return 3;
        if (prob > 25) return 4;
        return 5;
    }

    private generateConsensus(sensitivity: string): string {
        if (sensitivity === 'Aggressive') return 'Experts urge immediate cautionary action.';
        if (sensitivity === 'Conservative') return 'Experts suggest standard monitoring protocols.';
        return 'Consensus reached based on simulated data.';
    }
}

export const predictionService = new PredictionService();
