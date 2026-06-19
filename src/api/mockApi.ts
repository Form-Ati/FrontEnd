// 목 API — develop_system.md §5 REST 명세를 더미 데이터 위에서 구현.
// 백엔드 완성 시 이 파일만 실제 HTTP 클라이언트로 교체하면 된다(시그니처 유지).
import type {
  AiCreditLedgerEntry,
  AuditResult,
  CreditLedgerEntry,
  GeneratedQuestion,
  Report,
  ReportReason,
  Survey,
  SurveyQuestion,
  SurveyResponse,
  User,
} from '@/types/domain';
import { db, nextId } from '@/store/db';
import { SEED_CREDIT } from '@/data/seed';
import { delay, fail } from './errors';
import {
  costPerResponse,
  generateProofToken,
  isUniversityEmail,
  minDwellSeconds,
} from '@/lib/logic';
import { runAudit, runGenerate, runRefine } from './aiMock';

const nowIso = () => new Date().toISOString();
const REPORT_FREEZE_THRESHOLD = 3; // §7 신고 누적 임계치

// ── 원장 헬퍼: 원장 INSERT + users 잔액 UPDATE 를 함께 (develop_system.md §3/§4.1) ──
function applyCredit(
  userId: number,
  delta: number,
  reason: CreditLedgerEntry['reason'],
  refResponseId: number | null,
) {
  const s = db.get();
  const entry: CreditLedgerEntry = {
    id: nextId(),
    userId,
    delta,
    reason,
    refResponseId,
    createdAt: nowIso(),
  };
  db.set({
    creditLedger: [...s.creditLedger, entry],
    users: s.users.map((u) =>
      u.id === userId ? { ...u, responseCredit: u.responseCredit + delta } : u,
    ),
  });
}

function applyAiCredit(
  userId: number,
  delta: number,
  reason: AiCreditLedgerEntry['reason'],
  tokensUsed: number | null,
  refSessionId: number | null,
) {
  const s = db.get();
  const entry: AiCreditLedgerEntry = {
    id: nextId(),
    userId,
    delta,
    reason,
    tokensUsed,
    refSessionId,
    createdAt: nowIso(),
  };
  db.set({
    aiCreditLedger: [...s.aiCreditLedger, entry],
    users: s.users.map((u) =>
      u.id === userId ? { ...u, aiCredit: u.aiCredit + delta } : u,
    ),
  });
}

const me = () => {
  const s = db.get();
  const u = s.users.find((x) => x.id === s.currentUserId);
  if (!u) return fail('UNAUTHORIZED', '로그인이 필요해요.');
  return u;
};

export const api = {
  // ───────────────────────── Auth ─────────────────────────
  async signup(input: { email: string; nickname: string; password: string }) {
    await delay();
    if (!isUniversityEmail(input.email))
      fail('EMAIL_NOT_UNIVERSITY', '학교 이메일(.ac.kr / .edu)로 가입해 주세요.');
    const s = db.get();
    if (s.users.some((u) => u.email === input.email))
      fail('EMAIL_TAKEN', '이미 가입된 이메일이에요.');
    const user: User = {
      id: nextId(),
      email: input.email,
      nickname: input.nickname,
      university: null,
      verifiedAt: null,
      responseCredit: 0,
      aiCredit: 0,
      contribution: 0,
      status: 'ACTIVE',
      createdAt: nowIso(),
    };
    db.set({ users: [...s.users, user] });
    return { userId: user.id }; // 인증 코드 발송 가정
  },

  async verify(input: { email: string; code: string }) {
    await delay();
    if (input.code !== '000000' && !/^\d{6}$/.test(input.code))
      fail('CODE_INVALID', '인증 코드 6자리를 정확히 입력해 주세요.');
    const s = db.get();
    let verified: User | undefined;
    db.set({
      users: s.users.map((u) => {
        if (u.email !== input.email) return u;
        // 시드 크레딧 지급 (service.md §7 시나리오 1)
        verified = {
          ...u,
          verifiedAt: nowIso(),
          university: u.university ?? '한국대학교',
        };
        return verified;
      }),
    });
    if (verified && verified.responseCredit === 0) {
      applyCredit(verified.id, SEED_CREDIT, 'SEED', null);
    }
    return { verified: true };
  },

  async login(input: { email: string; password: string }) {
    await delay();
    const s = db.get();
    const u = s.users.find((x) => x.email === input.email);
    if (!u) fail('LOGIN_FAILED', '이메일 또는 비밀번호가 일치하지 않아요.');
    db.set({ currentUserId: u!.id });
    return { user: u!, accessToken: 'mock.access', refreshToken: 'mock.refresh' };
  },

  async me() {
    await delay(120);
    return me();
  },

  // ──────────────────────── Survey ────────────────────────
  async createSurvey(input: {
    title: string;
    description?: string;
    externalUrl?: string | null;
    category: string;
    estMinutes: number;
    targetCount: number;
    proofRequired: boolean;
    selfBuilt?: boolean;
    // 자체 빌더 문항 (selfBuilt 일 때)
    questions?: Omit<SurveyQuestion, 'id' | 'surveyId' | 'position'>[];
  }) {
    await delay();
    const u = me();
    const cost = costPerResponse(input.estMinutes);
    // 목표 응답 전부를 모으려면 cost*target 만큼 차감될 예정 — 잔액 안내용 검증
    const need = cost; // 최소 1회 응답분은 있어야 노출
    if (u.responseCredit < need)
      fail(
        'INSUFFICIENT_CREDIT',
        `응답 ${Math.ceil((need - u.responseCredit) / 1)}개를 더 해주면 설문을 올릴 수 있어요.`,
      );
    const surveyId = nextId();
    const survey: Survey = {
      id: surveyId,
      ownerId: u.id,
      title: input.title,
      description: input.description ?? null,
      externalUrl: input.externalUrl ?? null,
      category: input.category,
      estMinutes: input.estMinutes,
      targetCount: input.targetCount,
      collectedCount: 0,
      costPerResponse: cost,
      proofRequired: input.proofRequired,
      selfBuilt: input.selfBuilt ?? false,
      status: 'ACTIVE',
      createdAt: nowIso(),
    };
    const questions: SurveyQuestion[] = (input.questions ?? []).map((q, i) => ({
      ...q,
      id: nextId(),
      surveyId,
      position: i,
    }));
    const s = db.get();
    db.set({
      surveys: [survey, ...s.surveys],
      surveyQuestions: [...s.surveyQuestions, ...questions],
    });
    return survey;
  },

  async getSurveyQuestions(surveyId: number): Promise<SurveyQuestion[]> {
    await delay(150);
    return db
      .get()
      .surveyQuestions.filter((q) => q.surveyId === surveyId)
      .sort((a, b) => a.position - b.position);
  },

  async getSurvey(id: number): Promise<Survey> {
    await delay(150);
    const s = db.get();
    const survey = s.surveys.find((x) => x.id === id);
    if (!survey) fail('NOT_FOUND', '설문을 찾을 수 없어요.');
    return survey!;
  },

  async mySurveys(): Promise<Survey[]> {
    await delay(150);
    const u = me();
    const s = db.get();
    return s.surveys
      .filter((x) => x.ownerId === u.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async setSurveyStatus(id: number, status: 'ACTIVE' | 'PAUSED') {
    await delay();
    const s = db.get();
    db.set({
      surveys: s.surveys.map((x) =>
        x.id === id && x.status !== 'COMPLETED' ? { ...x, status } : x,
      ),
    });
    return (await this.getSurvey(id)) as Survey;
  },

  // ──────────────────── Feed (matching §4.2) ────────────────────
  async feed(page = 0): Promise<Survey[]> {
    await delay(200);
    const s = db.get();
    const respondedSurveyIds = new Set(
      s.responses.filter((r) => r.responderId === s.currentUserId).map((r) => r.surveyId),
    );
    return s.surveys
      .filter(
        (x) =>
          x.status === 'ACTIVE' &&
          x.ownerId !== s.currentUserId && // 내 설문 제외
          !respondedSurveyIds.has(x.id), // 이미 응답한 것 제외
      )
      .map((survey) => ({ survey, owner: s.users.find((u) => u.id === survey.ownerId) }))
      .sort((a, b) => scoreOf(b) - scoreOf(a))
      .slice(page * 10, page * 10 + 10)
      .map((x) => x.survey);
  },

  // ─────────────── Response (start / complete §4.1) ───────────────
  async startResponse(surveyId: number): Promise<SurveyResponse> {
    await delay(150);
    const s = db.get();
    const u = me();
    const survey = s.surveys.find((x) => x.id === surveyId);
    if (!survey) fail('NOT_FOUND', '설문을 찾을 수 없어요.');
    if (survey!.ownerId === u.id)
      fail('OWN_SURVEY', '자기 설문에는 응답할 수 없어요.');
    const existing = s.responses.find(
      (r) => r.surveyId === surveyId && r.responderId === u.id,
    );
    if (existing) {
      if (existing.status !== 'PENDING') fail('ALREADY_DONE', '이미 응답을 완료했어요.');
      return existing;
    }
    const resp: SurveyResponse = {
      id: nextId(),
      surveyId,
      responderId: u.id,
      status: 'PENDING',
      proofToken: survey!.proofRequired ? generateProofToken() : null,
      startedAt: nowIso(),
      completedAt: null,
      creditedAt: null,
      createdAt: nowIso(),
    };
    db.set({ responses: [...s.responses, resp] });
    return resp;
  },

  // §4.1 응답 완료 → 크레딧 정산. 한 트랜잭션처럼 순차 처리.
  async completeResponse(input: {
    surveyId: number;
    proofInput?: string;
  }): Promise<{ response: SurveyResponse; reward: number }> {
    await delay();
    const s = db.get();
    const u = me();
    const survey = s.surveys.find((x) => x.id === input.surveyId);
    if (!survey) fail('NOT_FOUND', '설문을 찾을 수 없어요.');
    if (survey!.status !== 'ACTIVE')
      fail('NOT_ACTIVE', '이 설문은 지금 응답을 받지 않아요.');
    if (survey!.ownerId === u.id) fail('OWN_SURVEY', '자기 설문에는 응답할 수 없어요.');

    const resp = s.responses.find(
      (r) => r.surveyId === input.surveyId && r.responderId === u.id,
    );
    if (!resp) fail('NOT_STARTED', '응답을 먼저 시작해 주세요.');
    if (resp!.status !== 'PENDING') fail('ALREADY_DONE', '이미 응답을 완료했어요.');

    // 무성의 응답 방어 — 최소 체류시간 (§4.1 / §6).
    // 자체 빌더는 실제 답안 제출이 완료 근거이므로 최소 한도(5초)만 적용한다.
    const dwell = (Date.now() - new Date(resp!.startedAt!).getTime()) / 1000;
    const minDwell = survey!.selfBuilt ? 5 : minDwellSeconds(survey!.estMinutes);
    if (dwell < minDwell)
      fail('TOO_FAST', '응답이 너무 빨라요. 성의 있게 참여해 주세요.');

    // 증빙 토큰 검증 (proof_required면)
    if (survey!.proofRequired && resp!.proofToken !== (input.proofInput ?? '').trim())
      fail('PROOF_MISMATCH', '증빙 코드가 일치하지 않아요.');

    const reward = survey!.costPerResponse;

    // 응답 상태 갱신 + 카운트 증가 + 완료 판정
    const newCount = survey!.collectedCount + 1;
    const completed = newCount >= survey!.targetCount;
    db.set({
      responses: s.responses.map((r) =>
        r.id === resp!.id
          ? {
              ...r,
              status: 'VERIFIED',
              completedAt: nowIso(),
              creditedAt: nowIso(),
            }
          : r,
      ),
      surveys: s.surveys.map((x) =>
        x.id === survey!.id
          ? { ...x, collectedCount: newCount, status: completed ? 'COMPLETED' : x.status }
          : x,
      ),
      // 응답자 기여도 +1 (갚은 응답 수 기반)
      users: s.users.map((x) =>
        x.id === u.id ? { ...x, contribution: x.contribution + 1 } : x,
      ),
    });

    // 정산: 응답자 적립(+) / 작성자 차감(−)
    applyCredit(u.id, +reward, 'EARN_RESPONSE', resp!.id);
    applyCredit(survey!.ownerId, -reward, 'SPEND_COLLECT', resp!.id);

    // 작성자 잔액이 음수가 되면 그의 모든 ACTIVE 설문 PAUSE (§4.1 spend)
    const owner = db.get().users.find((x) => x.id === survey!.ownerId);
    if (owner && owner.responseCredit < 0) {
      const s2 = db.get();
      db.set({
        surveys: s2.surveys.map((x) =>
          x.ownerId === owner.id && x.status === 'ACTIVE'
            ? { ...x, status: 'PAUSED' }
            : x,
        ),
      });
    }

    const finalResp = db.get().responses.find((r) => r.id === resp!.id)!;
    return { response: finalResp, reward };
  },

  // ───────────────────────── Report ─────────────────────────
  async report(input: {
    targetResponseId: number | null;
    reason: ReportReason;
    note?: string;
  }): Promise<Report> {
    await delay();
    const u = me();
    const s = db.get();
    const r: Report = {
      id: nextId(),
      reporterId: u.id,
      targetResponseId: input.targetResponseId,
      reason: input.reason,
      note: input.note ?? null,
      status: 'OPEN',
      createdAt: nowIso(),
    };
    db.set({ reports: [...s.reports, r] });

    // 신고 누적 임계치 초과 시 응답자 동결 (§7)
    if (input.targetResponseId) {
      const target = s.responses.find((x) => x.id === input.targetResponseId);
      if (target) {
        const count =
          db
            .get()
            .reports.filter(
              (x) =>
                x.targetResponseId &&
                s.responses.find((rr) => rr.id === x.targetResponseId)?.responderId ===
                  target.responderId,
            ).length;
        if (count >= REPORT_FREEZE_THRESHOLD) {
          const s3 = db.get();
          db.set({
            users: s3.users.map((x) =>
              x.id === target.responderId ? { ...x, status: 'FROZEN' } : x,
            ),
          });
        }
      }
    }
    return r;
  },

  // ───────────────────────── Credit ─────────────────────────
  async responseCredit() {
    await delay(120);
    const u = me();
    const s = db.get();
    return {
      balance: u.responseCredit,
      ledger: s.creditLedger
        .filter((e) => e.userId === u.id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    };
  },

  async aiCredit() {
    await delay(120);
    const u = me();
    const s = db.get();
    return {
      balance: u.aiCredit,
      ledger: s.aiCreditLedger
        .filter((e) => e.userId === u.id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    };
  },

  // ─────────────────────── AI (유료) ───────────────────────
  async aiRefine(goal: string): Promise<{ questions: string[]; researchQuestion: string }> {
    await delay(700);
    me();
    return runRefine(goal);
  },

  async aiGenerate(researchQuestion: string): Promise<{ questions: GeneratedQuestion[] }> {
    await delay(800);
    const u = me();
    const COST = 3;
    if (u.aiCredit < COST)
      fail('INSUFFICIENT_AI_CREDIT', 'AI 크레딧이 부족해요. 충전 후 다시 시도해 주세요.');
    const out = runGenerate(researchQuestion);
    const sessionId = nextId();
    const s = db.get();
    db.set({
      aiSessions: [
        ...s.aiSessions,
        {
          id: sessionId,
          userId: u.id,
          feature: 'GENERATE',
          inputSummary: researchQuestion.slice(0, 120),
          outputJson: out,
          tokensIn: 420,
          tokensOut: 980,
          costUsd: 0.012,
          createdAt: nowIso(),
        },
      ],
    });
    applyAiCredit(u.id, -COST, 'SPEND_DESIGN', 1400, sessionId);
    return out;
  },

  // 시그니처 기능 — 편향 감수 (§4.4)
  async aiAudit(questions: string[]): Promise<AuditResult> {
    await delay(900);
    const u = me();
    const COST = 4;
    if (questions.length === 0) fail('NO_INPUT', '감수할 문항을 입력해 주세요.');
    if (u.aiCredit < COST)
      fail('INSUFFICIENT_AI_CREDIT', 'AI 크레딧이 부족해요. 충전 후 다시 시도해 주세요.');
    const result = runAudit(questions);
    const sessionId = nextId();
    const s = db.get();
    db.set({
      aiSessions: [
        ...s.aiSessions,
        {
          id: sessionId,
          userId: u.id,
          feature: 'AUDIT',
          inputSummary: `${questions.length}개 문항 감수`,
          outputJson: result,
          tokensIn: 600,
          tokensOut: 1220,
          costUsd: 0.018,
          createdAt: nowIso(),
        },
      ],
    });
    applyAiCredit(u.id, -COST, 'SPEND_AUDIT', 1820, sessionId);
    return result;
  },

  async purchaseAiCredit(amount: number) {
    await delay(500);
    const u = me();
    applyAiCredit(u.id, amount, 'PURCHASE', null, null);
    return { balance: db.get().users.find((x) => x.id === u.id)!.aiCredit };
  },
};

// 피드 점수 계산 (api.feed 내부)
import { feedScore } from '@/lib/logic';
function scoreOf(x: { survey: Survey; owner?: User }): number {
  return feedScore(x.survey, x.owner, Date.now());
}
