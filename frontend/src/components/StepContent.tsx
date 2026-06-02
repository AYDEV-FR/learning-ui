import { useEffect, useRef } from 'preact/hooks';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/common';

interface Props {
  content: string;
  onRun: (command: string) => void;
}

/**
 * Renders markdown step content. Because the markdown is third-party HTML that
 * needs syntax highlighting and injected Copy/Run buttons, we render it
 * imperatively into a ref'd container rather than through the vdom.
 */
export function StepContent({ content, onRun }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onRun without re-running the render effect.
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    container.innerHTML = marked.parse(content) as string;

    container.querySelectorAll<HTMLElement>('pre code').forEach((block) => {
      hljs.highlightElement(block);
      addCodeActions(block.parentElement as HTMLElement, (cmd) =>
        onRunRef.current(cmd),
      );
    });

    container.scrollTop = 0;
  }, [content]);

  return <div class="panel-content" ref={ref} />;
}

function addCodeActions(pre: HTMLElement, onRun: (command: string) => void) {
  const code = pre.querySelector('code');
  if (!code) return;

  const isBash =
    code.classList.contains('language-bash') ||
    code.classList.contains('language-shell') ||
    code.classList.contains('language-sh') ||
    !code.className.includes('language-');

  const actions = document.createElement('div');
  actions.className = 'code-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'code-action-btn copy';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(code.textContent ?? '').then(() => {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 1500);
    });
  });
  actions.appendChild(copyBtn);

  if (isBash) {
    const runBtn = document.createElement('button');
    runBtn.className = 'code-action-btn run';
    runBtn.textContent = 'Run';
    runBtn.addEventListener('click', () => onRun(code.textContent ?? ''));
    actions.appendChild(runBtn);
  }

  pre.appendChild(actions);
}
