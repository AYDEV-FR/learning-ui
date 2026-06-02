import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { api } from '../lib/api';
import type {
  CheckResult,
  Scenario,
  Step,
  StepSummary,
  TabConfig,
} from '../lib/types';
import { InstructionsPanel } from './InstructionsPanel';
import {
  TerminalPanel,
  type TerminalPanelHandle,
} from './TerminalPanel';

export function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [initError, setInitError] = useState('');

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [steps, setSteps] = useState<StepSummary[]>([]);
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [terminalEnabled, setTerminalEnabled] = useState(true);

  const [step, setStep] = useState<Step | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  const terminalRef = useRef<TerminalPanelHandle>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const totalSteps = steps.length;

  const loadStep = useCallback(async (number: number) => {
    try {
      const data = await api.getStep(number);
      setStep(data);
      setStepError(null);
      setCheckResult(null);
    } catch (error) {
      setStepError((error as Error).message);
    }
  }, []);

  const navigateStep = useCallback(
    (delta: number) => {
      const current = step?.number ?? 1;
      const next = current + delta;
      if (next >= 1 && next <= totalSteps) loadStep(next);
    },
    [step, totalSteps, loadStep],
  );

  const runCommand = useCallback((command: string) => {
    terminalRef.current?.runOnActive(command);
  }, []);

  const checkCurrentStep = useCallback(async () => {
    if (!step) return;
    setChecking(true);
    try {
      const result = await api.checkStep(step.number);
      setCheckResult(result);
    } catch (error) {
      setCheckResult({
        success: false,
        message: `Check failed: ${(error as Error).message}`,
      });
    } finally {
      setChecking(false);
    }
  }, [step]);

  // Initial load.
  useEffect(() => {
    (async () => {
      try {
        const [scenarioData, stepsData, tabsResponse] = await Promise.all([
          api.getScenario(),
          api.getSteps(),
          api.getTabs(),
        ]);
        setScenario(scenarioData);
        setSteps(stepsData);
        setTabs(tabsResponse.tabs);
        setTerminalEnabled(tabsResponse.terminalEnabled);
        setStatus('ready');
        await loadStep(1);
      } catch (error) {
        setInitError((error as Error).message);
        setStatus('error');
      }
    })();
  }, [loadStep]);

  // Keep the latest values available to the stable keydown handler.
  const navRef = useRef({ navigateStep, checkCurrentStep, step });
  navRef.current = { navigateStep, checkCurrentStep, step };

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const terminalFocused = !!(
        document.activeElement &&
        document.activeElement.closest('.terminal-container')
      );

      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        terminalRef.current?.newTerminal();
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        terminalRef.current?.closeActive();
        return;
      }
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        terminalRef.current?.switchRelative(e.shiftKey ? -1 : 1);
        return;
      }

      if (terminalFocused) return;

      const { navigateStep, checkCurrentStep, step } = navRef.current;
      if (e.key === 'ArrowLeft') {
        navigateStep(-1);
      } else if (e.key === 'ArrowRight') {
        navigateStep(1);
      } else if (e.key === 'Enter' && e.ctrlKey && step?.hasCheck) {
        checkCurrentStep();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Resizable split between instructions and terminal panels.
  useEffect(() => {
    if (status !== 'ready') return;
    const handle = handleRef.current;
    const panel = instructionsRef.current;
    const container = containerRef.current;
    if (!handle || !panel || !container) return;

    let resizing = false;
    let startX = 0;
    let startWidth = 0;

    const onMouseDown = (e: MouseEvent) => {
      resizing = true;
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const delta = e.clientX - startX;
      const percentage = ((startWidth + delta) / container.offsetWidth) * 100;
      if (percentage >= 20 && percentage <= 50) {
        panel.style.width = `${percentage}%`;
        terminalRef.current?.fitActive();
      }
    };

    const onMouseUp = () => {
      if (!resizing) return;
      resizing = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      terminalRef.current?.fitActive();
    };

    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [status]);

  if (status === 'error') {
    return (
      <div class="container">
        <div class="panel instructions-panel">
          <div class="panel-content">
            <div class="error-message">
              <h2>Failed to load scenario</h2>
              <p>{initError}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading' || !scenario) {
    return (
      <div class="container">
        <div class="panel instructions-panel">
          <div class="panel-content">
            <div class="loading">Loading scenario...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="container" ref={containerRef}>
      <InstructionsPanel
        ref={instructionsRef}
        scenario={scenario}
        step={step}
        stepError={stepError}
        totalSteps={totalSteps}
        checkResult={checkResult}
        checking={checking}
        onPrev={() => navigateStep(-1)}
        onNext={() => navigateStep(1)}
        onCheck={checkCurrentStep}
        onRun={runCommand}
      />

      <div class="resize-handle" ref={handleRef} />

      <TerminalPanel
        ref={terminalRef}
        tabs={tabs}
        terminalEnabled={terminalEnabled}
      />

      {checking && (
        <div class="progress-overlay">
          <div class="progress-content">
            <div class="spinner" />
            <p>Checking...</p>
          </div>
        </div>
      )}
    </div>
  );
}
