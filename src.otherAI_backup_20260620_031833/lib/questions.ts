// 자체 설문 빌더 — 문항 드래프트 헬퍼.
import type { QuestionType, SurveyQuestion } from '@/types/domain';

export interface DraftQuestion {
  uid: string;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  options: string[];
  scaleMax: number;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
}

let uidSeq = 0;
export const newUid = () => `q_${Date.now()}_${++uidSeq}`;

export const CHOICE_TYPES: QuestionType[] = ['single', 'multi', 'dropdown'];
export const needsOptions = (t: QuestionType) => CHOICE_TYPES.includes(t);

export function newDraft(type: QuestionType = 'single'): DraftQuestion {
  return {
    uid: newUid(),
    type,
    title: '',
    description: null,
    required: false,
    options: needsOptions(type) ? ['옵션 1'] : [],
    scaleMax: 5,
    scaleMinLabel: null,
    scaleMaxLabel: null,
  };
}

// 타입 변경 시 옵션 정합성 보정
export function coerceForType(q: DraftQuestion, type: QuestionType): DraftQuestion {
  const next = { ...q, type };
  if (needsOptions(type) && next.options.length === 0) next.options = ['옵션 1'];
  if (!needsOptions(type)) next.options = [];
  return next;
}

export interface QuestionError {
  uid: string;
  message: string;
}

// 발행 전 검증
export function validateQuestions(qs: DraftQuestion[]): QuestionError[] {
  const errors: QuestionError[] = [];
  qs.forEach((q) => {
    if (!q.title.trim()) errors.push({ uid: q.uid, message: '질문을 입력해 주세요.' });
    if (needsOptions(q.type)) {
      const filled = q.options.filter((o) => o.trim());
      if (filled.length === 0)
        errors.push({ uid: q.uid, message: '선택지를 1개 이상 입력해 주세요.' });
    }
  });
  return errors;
}

// 드래프트 → API 입력(문항)
export function toQuestionInput(
  q: DraftQuestion,
): Omit<SurveyQuestion, 'id' | 'surveyId' | 'position'> {
  return {
    type: q.type,
    title: q.title.trim(),
    description: q.description?.trim() || null,
    required: q.required,
    options: needsOptions(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : [],
    scaleMax: q.scaleMax,
    scaleMinLabel: q.scaleMinLabel?.trim() || null,
    scaleMaxLabel: q.scaleMaxLabel?.trim() || null,
  };
}

// 예상 소요시간 자동 추정(분) — 문항 수 기반, 최소 1
export function estimateMinutes(count: number): number {
  return Math.max(1, Math.round(count * 0.4));
}
