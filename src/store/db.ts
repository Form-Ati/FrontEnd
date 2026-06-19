// 인메모리 "DB" — 백엔드를 대신하는 더미 저장소.
// 잔액 갱신은 develop_system.md §3 원칙대로 (원장 INSERT + users 잔액 UPDATE)를
// 한 번의 set() 안에서 함께 처리한다.
import { create } from 'zustand';
import type {
  AiCreditLedgerEntry,
  AiSession,
  CreditLedgerEntry,
  Report,
  Survey,
  SurveyQuestion,
  SurveyResponse,
  User,
} from '@/types/domain';
import {
  CURRENT_USER_ID,
  seedAiCreditLedger,
  seedCreditLedger,
  seedReports,
  seedResponses,
  seedSurveyQuestions,
  seedSurveys,
  seedUsers,
} from '@/data/seed';

let seq = 100000; // 신규 id 시퀀스
export const nextId = () => ++seq;

interface DbState {
  currentUserId: number;
  users: User[];
  surveys: Survey[];
  surveyQuestions: SurveyQuestion[];
  responses: SurveyResponse[];
  creditLedger: CreditLedgerEntry[];
  aiCreditLedger: AiCreditLedgerEntry[];
  aiSessions: AiSession[];
  reports: Report[];
}

export const useDb = create<DbState>(() => ({
  currentUserId: CURRENT_USER_ID,
  users: seedUsers,
  surveys: seedSurveys,
  surveyQuestions: seedSurveyQuestions,
  responses: seedResponses,
  creditLedger: seedCreditLedger,
  aiCreditLedger: seedAiCreditLedger,
  aiSessions: [],
  reports: seedReports,
}));

// 비반응형 접근 (mock API 내부에서 사용)
export const db = {
  get: useDb.getState,
  set: useDb.setState,
};
