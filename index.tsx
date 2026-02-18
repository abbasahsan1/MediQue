import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeTheme } from './hooks/use-theme';
import './styles.css';

try {
  initializeTheme();
} catch (e) {
  console.error('Theme init failed:', e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (e) {
  console.error('Render failed:', e);
  rootElement.innerHTML = `<div style="color: red; padding: 40px; font-family: monospace;">Error: ${String(e)}</div>`;
}
