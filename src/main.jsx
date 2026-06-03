import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { PortfolioProvider } from './context/PortfolioContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PortfolioProvider>
        <App />
      </PortfolioProvider>
    </AuthProvider>
  </StrictMode>,
)
