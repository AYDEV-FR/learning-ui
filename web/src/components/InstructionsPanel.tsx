import type { Scenario, Step, CheckResult } from '../types'
import { StepContent } from './StepContent'

interface Props {
  width: string
  scenario: Scenario | null
  step: Step | null
  currentStep: number
  totalSteps: number
  error: string | null
  checking: boolean
  checkResult: CheckResult | null
  onPrev: () => void
  onNext: () => void
  onCheck: () => void
  onRun: (command: string) => void
}

export function InstructionsPanel({
  width,
  scenario,
  step,
  currentStep,
  totalSteps,
  error,
  checking,
  checkResult,
  onPrev,
  onNext,
  onCheck,
  onRun,
}: Props) {
  return (
    <div className="panel instructions-panel" style={{ width }}>
      <div className="panel-header">
        <div className="scenario-info">
          <h1>{scenario?.name ?? 'Loading...'}</h1>
          <p>{scenario?.description ?? ''}</p>
        </div>
        <div className="step-indicator">
          <span id="current-step">{currentStep}</span> /{' '}
          <span>{totalSteps || '?'}</span>
        </div>
      </div>

      {error ? (
        <div className="panel-content">
          <div className="error-message">
            <h2>Something went wrong</h2>
            <p>{error}</p>
          </div>
        </div>
      ) : step ? (
        <StepContent content={step.content} onRun={onRun} />
      ) : (
        <div className="panel-content">
          <div className="loading">Loading scenario...</div>
        </div>
      )}

      <div className="panel-footer">
        <div className="step-navigation">
          <button
            className="btn btn-secondary"
            onClick={onPrev}
            disabled={currentStep <= 1}
          >
            <span className="arrow">&#8592;</span> Previous
          </button>
          {step?.hasCheck && (
            <button className="btn btn-primary" onClick={onCheck} disabled={checking}>
              Check
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={onNext}
            disabled={currentStep >= totalSteps}
          >
            Next <span className="arrow">&#8594;</span>
          </button>
        </div>
        {checkResult && (
          <div className={`check-result ${checkResult.success ? 'success' : 'error'}`}>
            {checkResult.message}
          </div>
        )}
      </div>
    </div>
  )
}
