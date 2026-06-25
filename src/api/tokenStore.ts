// 토큰 보관소 — http 계층과 인증 스토어가 공유한다.
// localStorage 영속 + 인메모리 캐시. React 의존 없음(http.ts 가 직접 사용).
const ACCESS_KEY = 'formaty.accessToken';
const REFRESH_KEY = 'formaty.refreshToken';

let access: string | null = readLS(ACCESS_KEY);
let refresh: string | null = readLS(REFRESH_KEY);

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* 프라이빗 모드 등에서 localStorage 불가 — 인메모리로만 동작 */
  }
}

export const tokenStore = {
  getAccess: () => access,
  getRefresh: () => refresh,
  hasSession: () => !!access,
  setTokens(accessToken: string, refreshToken: string) {
    access = accessToken;
    refresh = refreshToken;
    writeLS(ACCESS_KEY, accessToken);
    writeLS(REFRESH_KEY, refreshToken);
  },
  clear() {
    access = null;
    refresh = null;
    writeLS(ACCESS_KEY, null);
    writeLS(REFRESH_KEY, null);
  },
};

// refresh 가 끝내 실패해 강제 로그아웃해야 할 때 호출되는 핸들러.
// 인증 스토어가 등록해 사용자 상태/라우팅을 정리한다.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}
export function fireUnauthorized() {
  tokenStore.clear();
  if (onUnauthorized) {
    onUnauthorized();
  } else {
    // 핸들러 미등록 시 hard redirect (앱 초기화 전 만료 등)
    window.location.replace('/login');
  }
}
