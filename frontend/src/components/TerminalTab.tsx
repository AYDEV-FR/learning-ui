import { useEffect, useRef, useState } from 'preact/hooks';
import type { TerminalStatus } from './TerminalPanel';

interface Props {
  id: string;
  title: string;
  status: TerminalStatus;
  active: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function TerminalTab({
  id,
  title,
  status,
  active,
  onSelect,
  onClose,
  onRename,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(title);
    setEditing(true);
  };

  const commit = (save: boolean) => {
    if (!editing) return;
    if (save && draft.trim()) onRename(id, draft.trim());
    setEditing(false);
  };

  return (
    <div
      class={`terminal-tab${active ? ' active' : ''}`}
      onClick={() => !editing && onSelect(id)}
      onDblClick={(e) => {
        e.preventDefault();
        startEditing();
      }}
    >
      <span class={`terminal-tab-status ${status}`} />
      {editing ? (
        <input
          ref={inputRef}
          class="terminal-tab-title-input"
          value={draft}
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          onBlur={() => commit(true)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(true);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              commit(false);
            }
            e.stopPropagation();
          }}
        />
      ) : (
        <span class="terminal-tab-title">{title}</span>
      )}
      <span
        class="terminal-tab-close"
        title="Close terminal"
        onClick={(e) => {
          e.stopPropagation();
          onClose(id);
        }}
      >
        ×
      </span>
    </div>
  );
}
