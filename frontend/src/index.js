import React from 'react';
import { createRoot } from 'react-dom/client';  // Only need this import
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from '@mui/material/styles';
import darkTheme from './theme';

// Create root once using React 18 syntax
const root = createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// WebVitals (optional)
reportWebVitals();