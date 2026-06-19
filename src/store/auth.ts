import { create } from 'zustand';
import { db } from './db';

// 더미 인증 게이트. 시드 사용자(김설문)가 기본 로그인 상태라 바로 앱을 둘러볼 수 있다.
interface AuthState {
  authed: boolean;
  setAuthed: (v: boolean) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  authed: true,
  setAuthed: (v) => set({ authed: v }),
  logout: () => {
    db.set({ currentUserId: 1 });
    set({ authed: false });
  },
}));
