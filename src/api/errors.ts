// 공통 예외 — 백엔드 ApiResponse 의 { success:false, error:{ code, message } } 매핑.
// http 계층이 엔벨로프를 풀어 이 에러를 throw 하고, UI 는 code/message 로 분기·표출한다.
export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}
