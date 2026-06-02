import type {
  CheckResult,
  Scenario,
  Step,
  StepSummary,
  TabsResponse,
} from './types';

const API_BASE = '/api';

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getScenario: () => fetchAPI<Scenario>('/scenario'),
  getSteps: () => fetchAPI<StepSummary[]>('/steps'),
  getStep: (number: number) => fetchAPI<Step>(`/steps/${number}`),
  getTabs: () =>
    fetchAPI<TabsResponse>('/tabs').catch(
      (): TabsResponse => ({ tabs: [], terminalEnabled: true }),
    ),
  checkStep: async (number: number): Promise<CheckResult> => {
    const response = await fetch(`${API_BASE}/steps/${number}/check`, {
      method: 'POST',
    });
    return response.json() as Promise<CheckResult>;
  },
};

/** Build the websocket URL for the interactive terminal. */
export function terminalSocketURL(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/terminal`;
}
