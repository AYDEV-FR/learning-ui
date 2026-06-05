import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Library styles + app styles (bundled by Vite, no CDN at runtime).
import '@xterm/xterm/css/xterm.css'
import 'highlight.js/styles/github-dark.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
