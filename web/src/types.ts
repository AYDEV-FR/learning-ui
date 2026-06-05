// Mirrors the JSON returned by the Go backend (see main.go).

export interface Scenario {
  name: string
  description: string
  difficulty: string
  estimatedTime: string
  totalSteps: number
}

export interface StepSummary {
  number: number
  title: string
  hasCheck: boolean
}

export interface Step {
  number: number
  title: string
  content: string
  hasCheck: boolean
}

export interface CheckResult {
  success: boolean
  message: string
}

export interface TabConfig {
  id: string
  name: string
  icon: string
  url: string
  enabled: boolean
}

export interface TabsResponse {
  tabs: TabConfig[]
  terminalEnabled: boolean
}
