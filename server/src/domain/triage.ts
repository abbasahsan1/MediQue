import type { Priority } from './models.js';

export interface TriageRuleConfig {
  urgentSymptoms: string[];
}

export const classifyPriority = (
  symptoms: string[],
  config: TriageRuleConfig,
): Priority => {
  const urgentSet = new Set(config.urgentSymptoms.map((s) => s.toLowerCase()));
  const isUrgent = symptoms.some((symptom) => urgentSet.has(symptom.toLowerCase()));
  return isUrgent ? 'URGENT' : 'NORMAL';
};
