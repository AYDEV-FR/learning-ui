import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { TabConfig } from '../types'
import { TabIcon } from '../icons'
import {
  TerminalView,
  type TerminalHandle,
  type TerminalStatus,
} from './TerminalView'
import { IframeView } from './IframeView'

export interface TabbedPanelHandle {
  /** Send a command to the active terminal (used by the "Run" code button). */
  runCommand: (command: string) => void
}

interface Props {
  iframeTabs: TabConfig[]
  terminalEnabled: boolean
}

export const TabbedPanel = forwardRef<TabbedPanelHandle, Props>(
  function TabbedPanel({ iframeTabs, terminalEnabled }, ref) {
    const [terminals, setTerminals] = useState<string[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [statuses, setStatuses] = useState<Record<string, TerminalStatus>>({})
    const [names, setNames] = useState<Record<string, string>>({})
    const [editingId, setEditingId] = useState<string | null>(null)

    const counterRef = useRef(0)
    const handlesRef = useRef(new Map<string, TerminalHandle>())

    const addTerminal = useCallback(() => {
      counterRef.current += 1
      const id = `term-${counterRef.current}`
      setNames((n) => ({ ...n, [id]: `Terminal ${counterRef.current}` }))
      setTerminals((t) => [...t, id])
      setActiveId(id)
      return id
    }, [])

    const closeTerminal = useCallback(
      (id: string) => {
        setTerminals((prev) => {
          if (prev.length <= 1) return prev
          const index = prev.indexOf(id)
          if (index === -1) return prev
          const next = prev.filter((t) => t !== id)
          setActiveId((current) =>
            current === id ? next[Math.min(index, next.length - 1)] : current,
          )
          return next
        })
      },
      [],
    )

    // Initial tabs: first terminal (if enabled), otherwise activate the first iframe.
    useEffect(() => {
      if (terminalEnabled) {
        addTerminal()
      } else if (iframeTabs.length > 0) {
        setActiveId(`iframe-${iframeTabs[0].id}`)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useImperativeHandle(ref, () => ({
      runCommand: (command: string) => {
        if (!activeId) return
        const handle = handlesRef.current.get(activeId)
        if (handle?.isOpen()) {
          handle.send(command.trim() + '\n')
          handle.focus()
        }
      },
    }))

    // Terminal-scoped keyboard shortcuts (new / close / cycle tabs).
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
          e.preventDefault()
          addTerminal()
        } else if (e.ctrlKey && e.shiftKey && e.key === 'W') {
          e.preventDefault()
          if (activeId?.startsWith('term-')) closeTerminal(activeId)
        } else if (e.ctrlKey && e.key === 'Tab' && terminals.length > 1) {
          e.preventDefault()
          const i = terminals.indexOf(activeId ?? '')
          const next = e.shiftKey
            ? (i - 1 + terminals.length) % terminals.length
            : (i + 1) % terminals.length
          setActiveId(terminals[next])
        }
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [activeId, terminals, addTerminal, closeTerminal])

    const onReady = useCallback((id: string, handle: TerminalHandle) => {
      handlesRef.current.set(id, handle)
    }, [])
    const onDispose = useCallback((id: string) => {
      handlesRef.current.delete(id)
    }, [])
    const onStatusChange = useCallback((id: string, status: TerminalStatus) => {
      setStatuses((s) => ({ ...s, [id]: status }))
    }, [])

    const commitRename = (id: string, value: string) => {
      const trimmed = value.trim()
      if (trimmed) setNames((n) => ({ ...n, [id]: trimmed }))
      setEditingId(null)
    }

    return (
      <div className="panel terminal-panel">
        <div className="panel-header terminal-header">
          <div className="terminal-tabs">
            {iframeTabs.map((tab) => {
              const id = `iframe-${tab.id}`
              return (
                <div
                  key={id}
                  className={`terminal-tab iframe-tab${activeId === id ? ' active' : ''}`}
                  onClick={() => setActiveId(id)}
                >
                  <span className="terminal-tab-status connected" />
                  <TabIcon name={tab.icon} />
                  <span className="terminal-tab-title">{tab.name}</span>
                </div>
              )
            })}

            {terminals.map((id) => (
              <div
                key={id}
                className={`terminal-tab${activeId === id ? ' active' : ''}`}
                onClick={() => setActiveId(id)}
                onDoubleClick={() => setEditingId(id)}
              >
                <span className={`terminal-tab-status ${statuses[id] ?? 'connecting'}`} />
                {editingId === id ? (
                  <input
                    className="terminal-tab-title-input"
                    defaultValue={names[id]}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onBlur={(e) => commitRename(id, e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter') commitRename(id, e.currentTarget.value)
                      else if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                ) : (
                  <span className="terminal-tab-title">{names[id]}</span>
                )}
                <span
                  className="terminal-tab-close"
                  title="Close terminal"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTerminal(id)
                  }}
                >
                  &times;
                </span>
              </div>
            ))}

            {terminalEnabled && (
              <button
                className="btn-add-tab"
                title="New terminal (Ctrl+Shift+T)"
                onClick={addTerminal}
              >
                +
              </button>
            )}
          </div>
        </div>

        <div className="terminals-wrapper">
          {iframeTabs.map((tab) => {
            const id = `iframe-${tab.id}`
            return <IframeView key={id} tab={tab} active={activeId === id} />
          })}
          {terminals.map((id) => (
            <TerminalView
              key={id}
              id={id}
              active={activeId === id}
              onReady={onReady}
              onDispose={onDispose}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      </div>
    )
  },
)
