// 핵심 도메인 로직 — develop_system.md §4. 백엔드와 동일 규칙을 프런트에서 재현.
import type { Survey, User } from '@/types/domain';

// §4.3 비용 산정: cost_per_response = ceil(est_minutes / 2), 최소 1
export function costPerResponse(estMinutes: number): number {
  return Math.max(1, Math.ceil(estMinutes / 2));
}

// §4.1 무성의 응답 방어 — 최소 체류시간(초).
// 예상 소요시간의 20% 미만이면 의심, 단 최소 5초.
export function minDwellSeconds(estMinutes: number): number {
  return Math.max(Math.floor(estMinutes * 60 * 0.2), 5);
}

// §4.2 피드 정렬 점수
//   점수 = w1·잔여수 + w2·작성자기여도 + w3·(1/경과시간) − w4·소요시간
const W = { remain: 1.0, contribution: 0.6, freshness: 24, duration: 0.5 };

export function feedScore(survey: Survey, owner: User | undefined, now: number): number {
  const remain = Math.max(0, survey.targetCount - survey.collectedCount);
  const contribution = owner?.contribution ?? 0;
  const ageHours = Math.max(0.5, (now - new Date(survey.createdAt).getTime()) / 3_600_000);
  return (
    W.remain * remain +
    W.contribution * contribution +
    W.freshness * (1 / ageHours) -
    W.duration * survey.estMinutes
  );
}

// 증빙 토큰 생성 (응답자별 고유, 12자 — DDL proof_token VARCHAR(12))
const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateProofToken(): string {
  let t = '';
  for (let i = 0; i < 6; i++) {
    t += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
  }
  return t; // 6자리, 사용자가 외우기 쉽게
}

// 상호성 비율 — service.md §8: 받은 응답 대비 갚은 응답 (1에 가까울수록 건강)
export interface Reciprocity {
  given: number; // 갚은 응답 (남 설문에 응답한 수)
  received: number; // 받은 응답 (내 설문이 받은 응답 수)
  ratio: number;
  state: 'balanced' | 'owing' | 'ahead';
}

export function reciprocityState(given: number, received: number): Reciprocity {
  const ratio = received === 0 ? (given === 0 ? 1 : 2) : given / received;
  // 받기만 하고 안 갚으면(given < received - 1) owing(amber).
  let state: Reciprocity['state'] = 'balanced';
  if (received - given > 1) state = 'owing';
  else if (given - received > 1) state = 'ahead';
  return { given, received, ratio, state };
}

// 대학 이메일 판별 (.ac.kr / .edu) — A1 대학 이메일 인증
export function isUniversityEmail(email: string): boolean {
  return /@[^@\s]+\.(ac\.kr|edu)$/i.test(email.trim());
}
