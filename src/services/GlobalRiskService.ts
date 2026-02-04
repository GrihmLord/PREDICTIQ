import { expertVectorService, ExpertDefinition } from './ExpertVectorService';
import { generateSystemPrompt, ATTENTION_MASKS } from '../data/SystemPrompts';
import { RiskDomain, ClearanceLevel } from '../types/RiskTypes';

// export type RiskDomain = 'Geopolitical' | 'Cyber' | 'Bio-Security' | 'Economic' | 'Infrastructure';
// export type ClearanceLevel = 'Secret' | 'Top Secret' | 'Cosmic Top Secret';

export interface RiskAnalysisResult {
    defconLevel: 1 | 2 | 3 | 4 | 5;
    globalThreatScore: number;
    expertConsensus: string;
    activeThreats: string[];
    expertOpinions: { expertId: string; expertName: string; opinion: string; severity: number }[];
    roundTableLog: string[];
}

class GlobalRiskService {

    // Simulating the "Round Table" Consensus Protocol
    public async analyzeGlobalRisk(inputScenario: string, selectedExpertIds: string[] = []): Promise<RiskAnalysisResult> {

        // 1. Intelligent Routing
        let activeExperts: ExpertDefinition[] = [];
        if (selectedExpertIds.length === 0) {
            activeExperts = expertVectorService.findRelevantExperts(inputScenario);
            // Fallback if no specific matches
            if (activeExperts.length < 3) {
                const all = expertVectorService.getAllExperts();
                while (activeExperts.length < 3) {
                    const next = all[Math.floor(Math.random() * all.length)];
                    if (!activeExperts.find(e => e.id === next.id)) activeExperts.push(next);
                }
            }
        } else {
            activeExperts = expertVectorService.getAllExperts().filter(e => selectedExpertIds.includes(e.id));
        }

        const roundTableLog: string[] = [];
        const expertOpinions: { expertId: string; expertName: string; opinion: string; severity: number }[] = [];
        let maxSeverity = 0;

        // PHASE 1: Isolated Analysis
        roundTableLog.push(`[SYSTEM] Initializing Attention Masks for ${activeExperts.length} Nodes...`);

        for (const expert of activeExperts) {
            await new Promise(r => setTimeout(r, 600));

            const systemPrompt = generateSystemPrompt(expert);
            const severity = this.simulateSeverity(inputScenario, expert);
            const opinion = this.generateOpinion(inputScenario, expert, severity);

            expertOpinions.push({
                expertId: expert.id,
                expertName: expert.name,
                opinion,
                severity
            });

            if (severity > maxSeverity) maxSeverity = severity;

            roundTableLog.push(`[node:${expert.id}] Mask Active. Relevance: ${(severity / 10).toFixed(2)}. Output generated.`);
        }

        // PHASE 2: Cross-Examination
        const highSeverityThreats = expertOpinions.filter(o => o.severity > 7);
        if (highSeverityThreats.length > 0) {
            roundTableLog.push(`[PROTOCOL] Cross-Attention Event Triggered. ${highSeverityThreats.length} High-Severity Flags detected.`);

            for (const threat of highSeverityThreats) {
                // Simulate other experts checking this threat
                roundTableLog.push(`[BROADCAST] ${threat.expertName} flagging critical risk: "${threat.opinion.substring(0, 40)}..."`);
                await new Promise(r => setTimeout(r, 800));
                roundTableLog.push(`[CONSENSUS] Council acknowledging vector... Probability weights adjusted.`);
            }
        } else {
            roundTableLog.push(`[PROTOCOL] No critical anomalies detected in Phase 1. Standard synthesis.`);
        }

        // PHASE 3: Synthesis
        const avgSeverity = expertOpinions.reduce((acc, curr) => acc + curr.severity, 0) / expertOpinions.length;
        const defcon = this.calculateDefcon(maxSeverity, avgSeverity);

        return {
            defconLevel: defcon,
            globalThreatScore: avgSeverity * 10,
            expertConsensus: this.generateConsensusSummary(expertOpinions, defcon),
            activeThreats: expertOpinions.filter(o => o.severity > 5).map(o => `${o.expertName}: ${o.opinion.split('.')[0]}`),
            expertOpinions,
            roundTableLog
        };
    }

    private simulateSeverity(scenario: string, expert: ExpertDefinition): number {
        // Simple Simulation: Check for keywords in scenario
        let score = Math.floor(Math.random() * 4) + 1; // Base 1-5

        let relevance = 0;
        expert.focusKeywords.forEach(kw => {
            if (scenario.toLowerCase().includes(kw)) relevance++;
        });

        if (relevance > 0) {
            score += Math.floor(Math.random() * 6); // Add 0-5
            score += Math.min(relevance, 3);
        }

        return Math.min(score, 10);
    }

    private generateOpinion(scenario: string, expert: ExpertDefinition, severity: number): string {
        const severityText = severity > 7 ? "CRITICAL" : severity > 4 ? "MODERATE" : "NEGLIGIBLE";

        if (severity > 7) {
            if (expert.domain === 'Geopolitical') return `Immediate escalation probable. ${expert.focusKeywords[0]} triggers detected. Recommend diplomatic isolation.`;
            if (expert.domain === 'Cyber') return `Active breach signature matching ${expert.focusKeywords[1]} protocols. Infrastructure integrity compromised.`;
            if (expert.domain === 'Bio-Security') return `Pathogen vector confirmed. R0 estimates exceeding containment thresholds.`;
            if (expert.domain === 'AI Safety') return `Recursive self-improvement loop detected. Alignment sharding failure imminent.`;
            if (expert.domain === 'Orbital') return `Kessler cascade in LEO initiated. Telemetry lost on key assets.`;
            if (expert.domain === 'Quantum') return `Q-Day threshold breached. Standard encryption effectively null.`;
        }

        return `Monitoring ${expert.domain} vectors. ${severityText} activity related to input scenario. No immediate crossover event detected.`;
    }

    private calculateDefcon(maxSeverity: number, avgSeverity: number): 1 | 2 | 3 | 4 | 5 {
        if (maxSeverity >= 9 && avgSeverity > 6) return 1;
        if (maxSeverity >= 8) return 2;
        if (maxSeverity >= 6 || avgSeverity > 5) return 3;
        if (avgSeverity > 3) return 4;
        return 5;
    }

    private generateConsensusSummary(opinions: { expertName: string; severity: number }[], defcon: number): string {
        const criticalCount = opinions.filter(o => o.severity > 7).length;
        if (defcon === 1) return `MAXIMUM ALERT: ${criticalCount} domains reporting critical failures. Instant response required.`;
        if (defcon === 2) return `SEVERE RISK: Multiple vectors converging. ${opinions.find(o => o.severity > 7)?.expertName} leading the threat call.`;
        if (defcon === 3) return `ELEVATED: Monitoring unstable indicators. Readiness increased.`;
        if (defcon === 4) return `LOW: Standard baseline monitoring. Minor fluctuations detected.`;
        return `NORMAL: Global stability nominal. No significant anomalies.`;
    }

    public getAvailableExperts(): ExpertDefinition[] {
        return expertVectorService.getAllExperts();
    }
}

export const globalRiskService = new GlobalRiskService();
