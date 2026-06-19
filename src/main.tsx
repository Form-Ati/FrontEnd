import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Toaster } from './components/Toaster';
import { ConfirmHost } from './components/ConfirmDialog';
import { ScrollToTop } from './components/ScrollToTop';
import { DesktopFrame } from './components/DesktopFrame';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <DesktopFrame>
          <App />
          <Toaster />
          <ConfirmHost />
        </DesktopFrame>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
