import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { getDatabase } from './lib/database';

/**
 * Application Entry Point
 * Initialize database and render the application
 */

// Initialize database connection (migrations are handled by Tauri on startup)
getDatabase().catch((error: Error) => {
  console.error('Failed to initialize database:', error);
});

// Render the application
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
