// Shared types mirroring the Go backend JSON API.

export interface Scenario {
  name: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  totalSteps: number;
}

export interface StepSummary {
  number: number;
  title: string;
  hasCheck: boolean;
}

export interface Step extends StepSummary {
  content: string;
}

export interface CheckResult {
  success: boolean;
  message: string;
}

export interface TabConfig {
  id: string;
  name: string;
  icon: string;
  url: string;
  enabled: boolean;
}

export interface TabsResponse {
  tabs: TabConfig[];
  terminalEnabled: boolean;
}
