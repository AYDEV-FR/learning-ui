import { useEffect, useRef } from 'preact/hooks';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { terminalSocketURL } from '../lib/api';
import type { TerminalStatus } from './TerminalPanel';

/** Imperative API exposed to the parent for an individual terminal. */
export interface TerminalHandle {
  fit(): void;
  focus(): void;
  runCommand(text: string): void;
}

interface Props {
  id: string;
  active: boolean;
  onStatus: (id: string, status: TerminalStatus) => void;
  registerHandle: (id: string, handle: TerminalHandle | null) => void;
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
};

export function XTerm({ id, active, onStatus, registerHandle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Tracks whether the component is still mounted so the reconnect loop stops
  // once the terminal is closed.
  const mountedRef = useRef(true);

  // Create the terminal + websocket once, on mount.
  useEffect(() => {
    mountedRef.current = true;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: THEME,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current!);

    termRef.current = term;
    fitRef.current = fitAddon;

    term.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const connect = () => {
      onStatus(id, 'connecting');
      const ws = new WebSocket(terminalSocketURL());
      wsRef.current = ws;

      ws.onopen = () => {
        onStatus(id, 'connected');
        if (active) term.focus();
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          event.data.text().then((text) => term.write(text));
        } else {
          term.write(event.data);
        }
      };

      ws.onclose = () => {
        onStatus(id, 'disconnected');
        if (mountedRef.current) {
          term.write('\r\n\x1b[31mConnection closed. Reconnecting...\x1b[0m\r\n');
          setTimeout(() => {
            if (mountedRef.current) connect();
          }, 2000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onStatus(id, 'error');
      };
    };

    connect();

    const handle: TerminalHandle = {
      fit: () => fitAddon.fit(),
      focus: () => term.focus(),
      runCommand: (text: string) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(text.trim() + '\n');
          term.focus();
        }
      },
    };
    registerHandle(id, handle);

    return () => {
      mountedRef.current = false;
      registerHandle(id, null);
      wsRef.current?.close();
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Refit + focus whenever this terminal becomes the active tab.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      fitRef.current?.fit();
      if (!document.querySelector('.terminal-tab-title-input')) {
        termRef.current?.focus();
      }
    }, 10);
    return () => clearTimeout(t);
  }, [active]);

  return <div class="terminal-container" ref={containerRef} />;
}
