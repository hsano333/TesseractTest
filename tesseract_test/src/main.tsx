import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import App from './App.tsx'
import MyTesseractComponent from './MyTesseractComponent.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MyTesseractComponent />
  </StrictMode>,
)
