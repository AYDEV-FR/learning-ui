import { useEffect, useMemo, useRef } from 'react'
import { marked } from 'marked'
// 'common' bundles ~40 popular languages (bash, yaml, json, js, …) instead of
// all ~190, which keeps the JS bundle far smaller. Add more via registerLanguage.
import hljs from 'highlight.js/lib/common'

interface Props {
  content: string
  onRun: (command: string) => void
}

/**
 * Renders a step's Markdown, highlights code blocks, and injects Copy / Run
 * action buttons. "Run" sends the snippet to the active terminal via `onRun`.
 */
export function StepContent({ content, onRun }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const html = useMemo(() => marked.parse(content) as string, [content])

  useEffect(() => {
    const root = ref.current
    if (!root) return
    root.scrollTop = 0

    root.querySelectorAll<HTMLElement>('pre code').forEach((block) => {
      hljs.highlightElement(block)

      const pre = block.parentElement
      if (!pre || pre.querySelector('.code-actions')) return

      const isBash =
        block.classList.contains('language-bash') ||
        block.classList.contains('language-shell') ||
        block.classList.contains('language-sh') ||
        !block.className.includes('language-')

      const actions = document.createElement('div')
      actions.className = 'code-actions'

      const copyBtn = document.createElement('button')
      copyBtn.className = 'code-action-btn copy'
      copyBtn.textContent = 'Copy'
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(block.textContent ?? '').then(() => {
          copyBtn.textContent = 'Copied!'
          copyBtn.classList.add('copied')
          setTimeout(() => {
            copyBtn.textContent = 'Copy'
            copyBtn.classList.remove('copied')
          }, 1500)
        })
      })
      actions.appendChild(copyBtn)

      if (isBash) {
        const runBtn = document.createElement('button')
        runBtn.className = 'code-action-btn run'
        runBtn.textContent = 'Run'
        runBtn.addEventListener('click', () => onRun((block.textContent ?? '').trim()))
        actions.appendChild(runBtn)
      }

      pre.appendChild(actions)
    })
  }, [html, onRun])

  return (
    <div
      className="panel-content"
      ref={ref}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
