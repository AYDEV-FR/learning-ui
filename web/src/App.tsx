import { useCallback, useEffect, useRef, useState } from 'react'
import type { Scenario, StepSummary, Step, CheckResult, TabConfig } from './types'
import * as api from './api'
import { InstructionsPanel } from './components/InstructionsPanel'
import { TabbedPanel, type TabbedPanelHandle } from './components/TabbedPanel'
import { useResizable } from './hooks/useResizable'

interface TabsState {
  iframeTabs: TabConfig[]
  terminalEnabled: boolean
}

export default function App() {
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [steps, setSteps] = useState<StepSummary[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [step, setStep] = useState<Step | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [tabs, setTabs] = useState<TabsState | null>(null)

  const panelRef = useRef<TabbedPanelHandle>(null)
  const { width, dragging, onMouseDown } = useResizable()
  const totalSteps = steps.length

  const loadStep = useCallback(async (n: number) => {
    try {
      const data = await api.getStep(n)
      setStep(data)
      setCurrentStep(n)
      setCheckResult(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  // Initial load: scenario, steps, tabs config, then the first step.
  useEffect(() => {
    ;(async () => {
      try {
        const [scenarioData, stepsData, tabsData] = await Promise.all([
          api.getScenario(),
          api.getSteps(),
          api.getTabs(),
        ])
        setScenario(scenarioData)
        setSteps(stepsData)
        setTabs({
          iframeTabs: tabsData.tabs,
          terminalEnabled: tabsData.terminalEnabled,
        })
        await loadStep(1)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [loadStep])

  const navigate = useCallback(
    (delta: number) => {
      const next = currentStep + delta
      if (next >= 1 && next <= totalSteps) loadStep(next)
    },
    [currentStep, totalSteps, loadStep],
  )

  const onCheck = useCallback(async () => {
    setChecking(true)
    try {
      setCheckResult(await api.checkStep(currentStep))
    } catch (e) {
      setCheckResult({
        success: false,
        message: `Check failed: ${e instanceof Error ? e.message : String(e)}`,
      })
    } finally {
      setChecking(false)
    }
  }, [currentStep])

  const onRun = useCallback((command: string) => {
    panelRef.current?.runCommand(command)
  }, [])

  // Step navigation shortcuts (arrows / Ctrl+Enter), ignored while typing in the terminal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const inTerminal = !!el?.closest?.('.terminal-container')
      const inInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (inTerminal || inInput) return

      if (e.key === 'ArrowLeft') navigate(-1)
      else if (e.key === 'ArrowRight') navigate(1)
      else if (e.key === 'Enter' && e.ctrlKey && step?.hasCheck) onCheck()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, onCheck, step])

  return (
    <div className="container">
      <InstructionsPanel
        width={width}
        scenario={scenario}
        step={step}
        currentStep={currentStep}
        totalSteps={totalSteps}
        error={error}
        checking={checking}
        checkResult={checkResult}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onCheck={onCheck}
        onRun={onRun}
      />

      <div
        className={`resize-handle${dragging ? ' dragging' : ''}`}
        onMouseDown={onMouseDown}
      />

      {tabs && (
        <TabbedPanel
          ref={panelRef}
          iframeTabs={tabs.iframeTabs}
          terminalEnabled={tabs.terminalEnabled}
        />
      )}

      {checking && (
        <div className="progress-overlay">
          <div className="progress-content">
            <div className="spinner" />
            <p>Checking...</p>
          </div>
        </div>
      )}
    </div>
  )
}
