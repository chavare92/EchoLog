import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import './index.css';
import App from './App.tsx';
import { queryClient } from './lib/queryClient.ts';
import { AuthProvider } from './auth/AuthProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </JotaiProvider>
  </StrictMode>,
);
