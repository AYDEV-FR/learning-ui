import { forwardRef } from 'preact/compat';
import type { CheckResult, Scenario, Step } from '../lib/types';
import { StepContent } from './StepContent';

interface Props {
  scenario: Scenario;
  step: Step | null;
  stepError: string | null;
  totalSteps: number;
  checkResult: CheckResult | null;
  checking: boolean;
  onPrev: () => void;
  onNext: () => void;
  onCheck: () => void;
  onRun: (command: string) => void;
}

export const InstructionsPanel = forwardRef<HTMLDivElement, Props>(
  (
    {
      scenario,
      step,
      stepError,
      totalSteps,
      checkResult,
      checking,
      onPrev,
      onNext,
      onCheck,
      onRun,
    },
    ref,
  ) => {
    const currentStep = step?.number ?? 1;

    return (
      <div class="panel instructions-panel" ref={ref}>
        <div class="panel-header">
          <div class="scenario-info">
            <h1>{scenario.name}</h1>
            <p>{scenario.description}</p>
          </div>
          <div class="step-indicator">
            <span class="current">{currentStep}</span> / {totalSteps}
          </div>
        </div>

        {stepError ? (
          <div class="panel-content">
            <div class="error-message">
              <h2>Failed to load step</h2>
              <p>{stepError}</p>
            </div>
          </div>
        ) : step ? (
          <StepContent content={step.content} onRun={onRun} />
        ) : (
          <div class="panel-content">
            <div class="loading">Loading scenario...</div>
          </div>
        )}

        <div class="panel-footer">
          <div class="step-navigation">
            <button
              class="btn btn-secondary"
              disabled={currentStep <= 1}
              onClick={onPrev}
            >
              <span class="arrow">←</span> Previous
            </button>
            {step?.hasCheck && (
              <button
                class="btn btn-primary"
                disabled={checking}
                onClick={onCheck}
              >
                Check
              </button>
            )}
            <button
              class="btn btn-secondary"
              disabled={currentStep >= totalSteps}
              onClick={onNext}
            >
              Next <span class="arrow">→</span>
            </button>
          </div>
          {checkResult && (
            <div
              class={`check-result ${checkResult.success ? 'success' : 'error'}`}
            >
              {checkResult.message}
            </div>
          )}
        </div>
      </div>
    );
  },
);
