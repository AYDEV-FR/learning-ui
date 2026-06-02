import { useCallback, useRef, useState } from 'react'

/**
 * Drag-to-resize for the left instructions panel.
 * Returns the current width (as a CSS value) and a mousedown handler for the
 * resize handle. Width is clamped between `minPct` and `maxPct` of the container.
 */
export function useResizable(initialPct = 33.33, minPct = 20, maxPct = 50) {
  const [width, setWidth] = useState<string>(`${initialPct}%`)
  const [dragging, setDragging] = useState(false)
  const stateRef = useRef({ startX: 0, startWidth: 0 })

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const panel = (e.currentTarget as HTMLElement)
        .previousElementSibling as HTMLElement | null
      stateRef.current = {
        startX: e.clientX,
        startWidth: panel ? panel.offsetWidth : 0,
      }
      setDragging(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - stateRef.current.startX
        const newWidth = stateRef.current.startWidth + delta
        const containerWidth =
          document.querySelector('.container')?.clientWidth ?? window.innerWidth
        const pct = (newWidth / containerWidth) * 100
        if (pct >= minPct && pct <= maxPct) {
          setWidth(`${pct}%`)
        }
      }

      const onUp = () => {
        setDragging(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [minPct, maxPct],
  )

  return { width, dragging, onMouseDown }
}
