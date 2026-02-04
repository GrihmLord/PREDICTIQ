import { RiskDomain } from '../types/RiskTypes';

export interface ExpertDefinition {
    id: string;
    name: string;
    domain: RiskDomain;
    focusKeywords: string[]; // Positive Attention
    blindSpots: string[];    // Negative Attention
    vector: number[];        // Simulated embedding vector
}

export class ExpertVectorService {
    private experts: ExpertDefinition[] = [];

    constructor() {
        this.initializeExperts();
    }

    private initializeExperts() {
        this.experts = [
            {
                id: 'exp_geo_2026',
                name: 'Geopolitical Strategist',
                domain: 'Geopolitical',
                focusKeywords: ['border', 'treaty', 'sanction', 'election', 'proxy', 'sovereignty', 'territory', 'diplomacy'],
                blindSpots: ['server logs', 'code', 'encryption', 'stock prices', 'latency'],
                vector: [0.9, 0.1, 0.2, 0.8, 0.5] // Abstract representation
            },
            {
                id: 'exp_cyber_8200',
                name: 'Unit 8200 Cyber Analyst',
                domain: 'Cyber',
                focusKeywords: ['exploit', 'zero-day', 'grid', 'latency', 'apt', 'ddos', 'ransomware', 'backdoor', 'infrastructure'],
                blindSpots: ['cultural sentiment', 'stock prices', 'polling', 'trade tariffs'],
                vector: [0.2, 0.9, 0.3, 0.1, 0.7]
            },
            {
                id: 'exp_bio_shield',
                name: 'Synthetic Bio-Shield',
                domain: 'Bio-Security',
                focusKeywords: ['crispr', 'gain-of-function', 'genomic', 'leak', 'vector', 'pathogen', 'r0', 'transmission', 'zoonotic'],
                blindSpots: ['political polling', 'trade tariffs', 'interest rates', 'missile'],
                vector: [0.1, 0.3, 0.95, 0.2, 0.1]
            },
            {
                id: 'exp_ai_sentinel',
                name: 'AI Alignment Sentinel',
                domain: 'AI Safety',
                focusKeywords: ['recursive', 'containment', 'alignment', 'weights', 'agi', 'asi', 'singularity', 'hallucination', 'reward hacking'],
                blindSpots: ['human resources', 'tax policy', 'supply chain', 'weather'],
                vector: [0.3, 0.8, 0.4, 0.9, 0.2]
            },
            {
                id: 'exp_orbital',
                name: 'Orbital Defense Command',
                domain: 'Orbital',
                focusKeywords: ['kessler', 'asat', 'debris', 'telemetry', 'leo', 'geo', 'satellite', 'collision', 'launch'],
                blindSpots: ['ground infantry', 'viral trends', 'submarines', 'currency'],
                vector: [0.6, 0.7, 0.1, 0.3, 0.8]
            },
            {
                id: 'exp_quantum',
                name: 'Quantum Cryptanalyst',
                domain: 'Quantum',
                focusKeywords: ['q-day', 'lattice', 'decryption', 'entropy', 'qubit', 'superposition', 'shor', 'encryption'],
                blindSpots: ['conventional ballistics', 'biological agents', 'propaganda'],
                vector: [0.4, 0.9, 0.2, 0.5, 0.9]
            }
        ];
    }

    // Simulate Cosine Similarity between user input and expert vectors
    public findRelevantExperts(inputText: string, threshold: number = 0.3): ExpertDefinition[] {
        const inputTokens = inputText.toLowerCase().split(/\s+/);

        const scoredExperts = this.experts.map(expert => {
            let matchScore = 0;

            // Positive Attention: Boost score for matches
            expert.focusKeywords.forEach(keyword => {
                if (inputText.toLowerCase().includes(keyword.toLowerCase())) {
                    matchScore += 0.2; // Significant boost
                }
            });

            // Negative Attention: Penalty for blind spot matches (simulating "tuning out")
            expert.blindSpots.forEach(blindSpot => {
                if (inputText.toLowerCase().includes(blindSpot.toLowerCase())) {
                    matchScore -= 0.05; // Slight dampening
                }
            });

            // Normalize slightly to keep within 0-1 range roughly for this simulation
            return { expert, score: Math.min(Math.max(matchScore, 0), 1) };
        });

        // Sort by relevance
        return scoredExperts
            .filter(item => item.score > threshold)
            .sort((a, b) => b.score - a.score)
            .map(item => item.expert);
    }

    public getAllExperts(): ExpertDefinition[] {
        return this.experts;
    }
}

export const expertVectorService = new ExpertVectorService();
