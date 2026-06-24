import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Toaster } from './components/Toaster';
import { ConfirmHost } from './components/ConfirmDialog';
import { ScrollToTop } from './components/ScrollToTop';
import { DesktopFrame } from './components/DesktopFrame';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ApiError } from './api/errors';
import { useToast } from './store/ui';
import './styles/global.css';

const RETRYABLE = ['NETWORK', 'TIMEOUT'];

const queryClient = new QueryClient({
  // 쿼리 에러를 한 곳에서 토스트로 표출(401 은 http 계층이 로그아웃 처리).
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'UNAUTHORIZED') return;
      const message =
        error instanceof ApiError ? error.message : '데이터를 불러오지 못했어요.';
      useToast.getState().push(message, 'warning');
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      // 비즈니스/4xx(ApiError)는 재시도 안 함. 네트워크/타임아웃만 1회.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !RETRYABLE.includes(error.code)) return false;
        return failureCount < 1;
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <DesktopFrame>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          <Toaster />
          <ConfirmHost />
        </DesktopFrame>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
