import ReactDOM from 'react-dom/client'
import { App } from './App.tsx'
import './styles.css'

const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(<App />)
}
