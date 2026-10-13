import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { queryClient } from './api/queryClient';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--sheet)',
            color: 'var(--ink)',
            border: '1px solid var(--rule)',
            borderRadius: '6px',
            fontFamily: 'var(--font-body)',
            fontSize: '13.5px',
            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.12)',
          },
          success: { iconTheme: { primary: 'var(--pass)', secondary: 'var(--sheet)' } },
          error: { iconTheme: { primary: 'var(--fail)', secondary: 'var(--sheet)' } },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);
