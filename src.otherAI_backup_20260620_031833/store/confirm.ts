import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((ok: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

// 명령형 확인 다이얼로그. 호출부: `if (await confirm({...})) doThing()`.
export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, options, resolve });
    }),
  settle: (ok) => {
    get().resolve?.(ok);
    set({ open: false, resolve: null });
  },
}));

// 컴포넌트에서 쓰기 좋은 헬퍼
export const confirmDialog = (options: ConfirmOptions) => useConfirmStore.getState().confirm(options);
