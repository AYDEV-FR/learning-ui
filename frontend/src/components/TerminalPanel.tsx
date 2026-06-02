import { forwardRef, useImperativeHandle } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { TabConfig } from '../lib/types';
import { TabIcon } from './icons';
import { XTerm, type TerminalHandle } from './XTerm';
import { TerminalTab } from './TerminalTab';

export type TerminalStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

interface TerminalState {
  id: string;
  title: string;
  status: TerminalStatus;
}

/** Imperative API exposed to the app shell for keyboard shortcuts and "Run". */
export interface TerminalPanelHandle {
  runOnActive(command: string): void;
  fitActive(): void;
  newTerminal(): void;
  closeActive(): void;
  switchRelative(delta: number): void;
}

interface Props {
  tabs: TabConfig[];
  terminalEnabled: boolean;
}

export const TerminalPanel = forwardRef<TerminalPanelHandle, Props>(
  ({ tabs, terminalEnabled }, ref) => {
    const [terminals, setTerminals] = useState<TerminalState[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const handles = useRef(new Map<string, TerminalHandle>());
    const counter = useRef(0);
    // Mirror of activeId for use inside stable callbacks.
    const activeIdRef = useRef<string | null>(null);
    activeIdRef.current = activeId;

    const registerHandle = useCallback(
      (id: string, handle: TerminalHandle | null) => {
        if (handle) handles.current.set(id, handle);
        else handles.current.delete(id);
      },
      [],
    );

    const handleStatus = useCallback((id: string, status: TerminalStatus) => {
      setTerminals((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t)),
      );
    }, []);

    const newTerminal = useCallback(() => {
      counter.current += 1;
      const id = `term-${counter.current}`;
      setTerminals((prev) => [
        ...prev,
        { id, title: `Terminal ${counter.current}`, status: 'connecting' },
      ]);
      setActiveId(id);
    }, []);

    const closeTerminal = useCallback((id: string) => {
      setTerminals((prev) => {
        if (prev.length <= 1) return prev; // never close the last terminal
        const index = prev.findIndex((t) => t.id === id);
        if (index === -1) return prev;
        const next = prev.filter((t) => t.id !== id);
        if (activeIdRef.current === id) {
          const newIndex = Math.min(index, next.length - 1);
          setActiveId(next[newIndex].id);
        }
        return next;
      });
    }, []);

    const renameTerminal = useCallback((id: string, title: string) => {
      setTerminals((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title } : t)),
      );
    }, []);

    // Initial tab setup: iframe tabs come from config, plus an optional first
    // terminal. Runs once.
    useEffect(() => {
      if (terminalEnabled) {
        newTerminal();
      } else if (tabs.length > 0) {
        setActiveId(`iframe-${tabs[0].id}`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refit the active terminal when the window resizes.
    useEffect(() => {
      const onResize = () => {
        const id = activeIdRef.current;
        if (id) handles.current.get(id)?.fit();
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    useImperativeHandle(
      ref,
      (): TerminalPanelHandle => ({
        runOnActive: (command) => {
          const id = activeIdRef.current;
          if (id) handles.current.get(id)?.runCommand(command);
        },
        fitActive: () => {
          const id = activeIdRef.current;
          if (id) handles.current.get(id)?.fit();
        },
        newTerminal,
        closeActive: () => {
          const id = activeIdRef.current;
          if (id && id.startsWith('term-')) closeTerminal(id);
        },
        switchRelative: (delta) => {
          setTerminals((prev) => {
            if (prev.length === 0) return prev;
            const currentIndex = prev.findIndex(
              (t) => t.id === activeIdRef.current,
            );
            let newIndex: number;
            if (delta < 0) {
              newIndex = currentIndex > 0 ? currentIndex - 1 : prev.length - 1;
            } else {
              newIndex = currentIndex < prev.length - 1 ? currentIndex + 1 : 0;
            }
            setActiveId(prev[newIndex].id);
            return prev;
          });
        },
      }),
      [newTerminal, closeTerminal],
    );

    return (
      <div class="panel terminal-panel">
        <div class="panel-header terminal-header">
          <div class="terminal-tabs">
            {tabs.map((tab) => {
              const id = `iframe-${tab.id}`;
              return (
                <div
                  key={id}
                  class={`terminal-tab iframe-tab${activeId === id ? ' active' : ''}`}
                  onClick={() => setActiveId(id)}
                >
                  <span class="terminal-tab-status connected" />
                  <TabIcon name={tab.icon} />
                  <span class="terminal-tab-title">{tab.name}</span>
                </div>
              );
            })}
            {terminals.map((t) => (
              <TerminalTab
                key={t.id}
                id={t.id}
                title={t.title}
                status={t.status}
                active={activeId === t.id}
                onSelect={setActiveId}
                onClose={closeTerminal}
                onRename={renameTerminal}
              />
            ))}
            {terminalEnabled && (
              <button
                class="btn-add-tab"
                title="New terminal (Ctrl+Shift+T)"
                onClick={newTerminal}
              >
                +
              </button>
            )}
          </div>
        </div>
        <div class="terminals-wrapper">
          {tabs.map((tab) => {
            const id = `iframe-${tab.id}`;
            return (
              <div
                key={id}
                class={`terminal-instance iframe-instance${activeId === id ? ' active' : ''}`}
              >
                <iframe
                  src={tab.url}
                  class="iframe-container"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            );
          })}
          {terminals.map((t) => (
            <div
              key={t.id}
              class={`terminal-instance${activeId === t.id ? ' active' : ''}`}
            >
              <XTerm
                id={t.id}
                active={activeId === t.id}
                onStatus={handleStatus}
                registerHandle={registerHandle}
              />
            </div>
          ))}
        </div>
      </div>
    );
  },
);
