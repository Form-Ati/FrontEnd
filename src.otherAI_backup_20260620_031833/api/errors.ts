// 공통 응답/예외 — develop_system.md §5 공통 응답 포맷
// { success:false, error:{ code, message(사람이 읽는 메시지) } }
export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

export const fail = (code: string, message: string): never => {
  throw new ApiError(code, message);
};

// 목 네트워크 지연 (UX/로딩 상태 확인용)
export const delay = (ms = 380) => new Promise((r) => setTimeout(r, ms));
