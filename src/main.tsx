import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EconomicsPortfolio from './economics_portfolio'
const rootEl = document.getElementById('root')

if (!rootEl) {
  throw new Error('Root element not found')
}

const root = createRoot(rootEl)

root.render(
  <React.StrictMode>
    <EconomicsPortfolio />
  </React.StrictMode>
)
