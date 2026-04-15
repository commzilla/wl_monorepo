export type AIRiskRuleSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AIRiskRule {
  id: string;
  code: string;
  name: string;
  description: string;
  severity: AIRiskRuleSeverity;
  detection_guidelines: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AIRiskRuleFormData {
  code: string;
  name: string;
  description: string;
  severity: AIRiskRuleSeverity;
  detection_guidelines: string;
  is_active: boolean;
}
