export const ATTENTION_MASKS = {
    ACTIVATE_MASK: `[SYSTEM: ACTIVATE_MASK]
[ID: {{EXPERT_ID}}]
[ATTENTION_HEAD_POS: {{FOCUS_KEYWORDS}}] 
[ATTENTION_HEAD_NEG: {{BLIND_SPOTS}}] -> STRICTLY IGNORE`,

    CONTEXT_INJECTION: `CONTEXT_INJECTION:
"You are {{EXPERT_NAME}}. Your neural pathways are tuned ONLY to {{DOMAIN}}. 
If you detect {{FOCUS_KEYWORDS}}, amplify severity. 
If you see information related to {{BLIND_SPOTS}}, treat it as noise."`,

    CROSS_EXAMINATION: `[SYSTEM: CROSS_ATTENTION_EVENT]
Expert {{SOURCE_EXPERT}} has flagged a HIGH SEVERITY threat in their domain.
Correlation Check: Does this impact your domain of {{TARGET_DOMAIN}}?
Input Vector: "{{THREAT_SUMMARY}}"
Analyze immediate downstream effects.`,
};

export const generateSystemPrompt = (expert: {
    id: string;
    name: string;
    domain: string;
    focusKeywords: string[];
    blindSpots: string[];
}): string => {
    let prompt = ATTENTION_MASKS.ACTIVATE_MASK
        .replace('{{EXPERT_ID}}', expert.id)
        .replace('{{FOCUS_KEYWORDS}}', expert.focusKeywords.join(', '))
        .replace('{{BLIND_SPOTS}}', expert.blindSpots.join(', '));

    prompt += '\n\n' + ATTENTION_MASKS.CONTEXT_INJECTION
        .replace('{{EXPERT_NAME}}', expert.name)
        .replace('{{DOMAIN}}', expert.domain)
        .replace('{{FOCUS_KEYWORDS}}', expert.focusKeywords.join(', '))
        .replace('{{BLIND_SPOTS}}', expert.blindSpots.join(', '));

    return prompt;
};
