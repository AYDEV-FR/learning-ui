import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { terminalWsUrl } from '../api'

export type TerminalStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/** Imperative handle other components use to drive a terminal (e.g. "Run" button). */
export interface TerminalHandle {
  send: (data: string) => void
  focus: () => void
  fit: () => void
  isOpen: () => boolean
}

interface Props {
  id: string
  active: boolean
  onReady: (id: string, handle: TerminalHandle) => void
  onDispose: (id: string) => void
  onStatusChange: (id: string, status: TerminalStatus) => void
}

const THEME = {
  background: '#1a1b26',
  foreground: '#c0caf5',
  cursor: '#c0caf5',
  cursorAccent: '#1a1b26',
  selectionBackground: 'rgba(122, 162, 247, 0.3)',
  black: '#414868',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#c0caf5',
  brightBlack: '#414868',
  brightRed: '#f7768e',
  brightGreen: '#9ece6a',
  brightYellow: '#e0af68',
  brightBlue: '#7aa2f7',
  brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff',
  brightWhite: '#c0caf5',
}

export function TerminalView({ id, active, onReady, onDispose, onStatusChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const disposedRef = useRef(false)

  // Create the terminal, wire the WebSocket, and auto-fit. Runs once per mount.
  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: THEME,
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())
    term.open(containerRef.current!)

    termRef.current = term
    fitRef.current = fitAddon

    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(data)
      }
    })

    const connect = () => {
      onStatusChange(id, 'connecting')
      const ws = new WebSocket(terminalWsUrl())
      wsRef.current = ws

      ws.onopen = () => onStatusChange(id, 'connected')
      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          event.data.text().then((text) => term.write(text))
        } else {
          term.write(event.data)
        }
      }
      ws.onclose = () => {
        if (disposedRef.current) return
        onStatusChange(id, 'disconnected')
        term.write('\r\n\x1b[31mConnection closed. Reconnecting...\x1b[0m\r\n')
        setTimeout(() => {
          if (!disposedRef.current) connect()
        }, 2000)
      }
      ws.onerror = () => onStatusChange(id, 'error')
    }
    connect()

    // Auto-fit whenever the container changes size (panel resize, window resize, tab switch).
    const ro = new ResizeObserver(() => {
      try {
        fitAddon.fit()
      } catch {
        /* container not visible yet */
      }
    })
    ro.observe(containerRef.current!)

    const handle: TerminalHandle = {
      send: (data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(data)
      },
      focus: () => term.focus(),
      fit: () => {
        try {
          fitAddon.fit()
        } catch {
          /* not visible */
        }
      },
      isOpen: () => wsRef.current?.readyState === WebSocket.OPEN,
    }
    onReady(id, handle)

    return () => {
      disposedRef.current = true
      ro.disconnect()
      wsRef.current?.close()
      term.dispose()
      onDispose(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Fit + focus when this terminal becomes the active tab.
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => {
      fitRef.current?.fit()
      termRef.current?.focus()
    }, 10)
    return () => clearTimeout(t)
  }, [active])

  return (
    <div className={`terminal-instance${active ? ' active' : ''}`}>
      <div className="terminal-container" ref={containerRef} />
    </div>
  )
}
