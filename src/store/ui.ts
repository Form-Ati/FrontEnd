import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UiState {
  theme: Theme;
  toggleTheme: () => void;
}

// 항상 화이트(라이트) 모드로 시작. 시스템 다크 설정을 따라가지 않는다.
// 다크 모드는 마이페이지 토글로만 켤 수 있다.
const initialTheme: Theme = 'light';

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#11141b' : '#34a866');
  }
}
applyTheme(initialTheme);

export const useUi = create<UiState>((set, get) => ({
  theme: initialTheme,
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    set({ theme: next });
  },
}));

// ── Toast ──
export interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'positive' | 'warning' | 'danger';
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 0;
export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = 'default') => {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
