import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

window.addEventListener('error', (event) => {
  window.api.logClientError(
    'renderer.error',
    `${event.message}\n${event.filename}:${event.lineno}:${event.colno}\n${event.error?.stack ?? ''}`
  )
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const message = reason instanceof Error ? `${reason.message}\n${reason.stack ?? ''}` : String(reason)
  window.api.logClientError('renderer.unhandledrejection', message)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
