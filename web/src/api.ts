import type { Scenario, StepSummary, Step, CheckResult, TabsResponse } from './types'

const API_BASE = '/api'

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const getScenario = () => fetchAPI<Scenario>('/scenario')

export const getSteps = () => fetchAPI<StepSummary[]>('/steps')

export const getStep = (n: number) => fetchAPI<Step>(`/steps/${n}`)

export const getTabs = () =>
  fetchAPI<TabsResponse>('/tabs').catch<TabsResponse>(() => ({
    tabs: [],
    terminalEnabled: true,
  }))

export async function checkStep(n: number): Promise<CheckResult> {
  const response = await fetch(`${API_BASE}/steps/${n}/check`, { method: 'POST' })
  return response.json() as Promise<CheckResult>
}

/** Build the terminal WebSocket URL from the current location. */
export function terminalWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/terminal`
}
