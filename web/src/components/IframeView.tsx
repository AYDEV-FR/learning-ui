import type { TabConfig } from '../types'

export function IframeView({ tab, active }: { tab: TabConfig; active: boolean }) {
  return (
    <div className={`terminal-instance iframe-instance${active ? ' active' : ''}`}>
      <iframe
        src={tab.url}
        className="iframe-container"
        allow="clipboard-read; clipboard-write"
        title={tab.name}
      />
    </div>
  )
}
