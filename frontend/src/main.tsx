import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { setupMocks } from './mocks/setupMocks'
import App from './App.tsx'

setupMocks()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
