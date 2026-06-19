// 더미 시드 데이터 — 백엔드 연동 전 디자인/흐름 검증용. (mockup 수치에 맞춤)
// 페르소나(service.md §7): 김설문(현재 로그인 사용자, id=1).
import type {
  AiCreditLedgerEntry,
  CreditLedgerEntry,
  Report,
  Survey,
  SurveyQuestion,
  SurveyResponse,
  User,
} from '@/types/domain';
import { costPerResponse } from '@/lib/logic';

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60000).toISOString();

export const CURRENT_USER_ID = 1;
export const SEED_CREDIT = 5; // 가입 시드 크레딧 (mockup: 시작 크레딧 5개)

export const seedUsers: User[] = [
  {
    id: 1,
    email: 'survey.kim@univ.ac.kr',
    nickname: '김설문',
    university: '경영학과 4학년',
    verifiedAt: ago(60 * 24 * 12),
    responseCredit: 5,
    aiCredit: 30,
    contribution: 12, // 갚은 응답 수 (= 상호성 게이지 '갚은 응답')
    status: 'ACTIVE',
    createdAt: ago(60 * 24 * 12),
  },
  { id: 2, email: 'minji@univ.ac.kr', nickname: '김민지', university: '경영학부', verifiedAt: ago(99999), responseCredit: 40, aiCredit: 0, contribution: 22, status: 'ACTIVE', createdAt: ago(99999) },
  { id: 3, email: 'siyeon@univ.ac.kr', nickname: '이시연', university: '심리학과', verifiedAt: ago(99999), responseCredit: 18, aiCredit: 12, contribution: 9, status: 'ACTIVE', createdAt: ago(99999) },
  { id: 4, email: 'junwoo@univ.ac.kr', nickname: '박준우', university: '체육학과', verifiedAt: ago(99999), responseCredit: 25, aiCredit: 0, contribution: 15, status: 'ACTIVE', createdAt: ago(99999) },
  { id: 5, email: 'haerin@univ.ac.kr', nickname: '정해린', university: '산업디자인학과', verifiedAt: ago(99999), responseCredit: 7, aiCredit: 8, contribution: 5, status: 'ACTIVE', createdAt: ago(99999) },
];

function mk(
  p: Omit<Survey, 'costPerResponse' | 'selfBuilt'> &
    Partial<Pick<Survey, 'costPerResponse' | 'selfBuilt'>>,
): Survey {
  // 폼앗이는 자체 빌더만 사용 — 모든 설문을 앱 내 응답(self-built)로 강제.
  return {
    ...p,
    costPerResponse: p.costPerResponse ?? costPerResponse(p.estMinutes),
    externalUrl: null,
    proofRequired: false,
    selfBuilt: true,
  };
}

export const seedSurveys: Survey[] = [
  mk({
    id: 101,
    ownerId: 2,
    title: '대학생 아르바이트 경험 조사',
    description:
      '대학생의 아르바이트 경험과 인식에 관한 연구를 진행하고 있습니다. 솔직한 답변 부탁드려요.',
    externalUrl: 'https://forms.gle/abc123',
    category: '학업/전공',
    estMinutes: 3,
    targetCount: 100,
    collectedCount: 63,
    proofRequired: true,
    status: 'ACTIVE',
    createdAt: ago(40),
  }),
  mk({ id: 102, ownerId: 3, title: '카페 이용 패턴에 대한 설문', description: '평소 카페를 어떻게 이용하는지 알아봅니다.', externalUrl: 'https://forms.gle/cafe', category: '소비/트렌드', estMinutes: 2, targetCount: 80, collectedCount: 31, proofRequired: false, status: 'ACTIVE', createdAt: ago(120) }),
  mk({ id: 103, ownerId: 4, title: '대학생 운동 습관 조사', description: '운동 빈도와 동기를 조사합니다.', externalUrl: 'https://forms.gle/sport', category: '건강/운동', estMinutes: 4, targetCount: 120, collectedCount: 12, proofRequired: false, status: 'ACTIVE', createdAt: ago(300) }),
  mk({ id: 104, ownerId: 5, title: '대학생 구독 서비스 지출 조사', description: 'OTT·음악 등 구독 지출 패턴을 묻습니다.', externalUrl: 'https://forms.gle/subs', category: '소비/트렌드', estMinutes: 3, targetCount: 60, collectedCount: 55, proofRequired: true, status: 'ACTIVE', createdAt: ago(90) }),
  mk({ id: 105, ownerId: 2, title: 'AI 코딩 도구 사용 경험', description: 'ChatGPT·Copilot 사용 전후의 학습 변화를 조사합니다.', externalUrl: 'https://forms.gle/aicode', category: '학업/전공', estMinutes: 5, targetCount: 100, collectedCount: 9, proofRequired: true, status: 'ACTIVE', createdAt: ago(20) }),
  mk({ id: 106, ownerId: 3, title: '교내 창업 동아리 수요 조사', description: '창업에 관심 있는 학생들의 니즈를 파악합니다.', externalUrl: 'https://forms.gle/startup', category: '창업/사업', estMinutes: 3, targetCount: 40, collectedCount: 5, proofRequired: false, status: 'ACTIVE', createdAt: ago(8) }),

  // 자체 빌더로 만든 설문 — 앱 안에서 바로 응답(폼 렌더링) 데모
  mk({ id: 107, ownerId: 4, title: '대학생 점심 식사 패턴 조사', description: '폼앗이 안에서 바로 응답할 수 있는 설문이에요.', externalUrl: null, category: '소비/트렌드', estMinutes: 2, targetCount: 50, collectedCount: 18, proofRequired: false, selfBuilt: true, status: 'ACTIVE', createdAt: ago(15) }),

  // 현재 사용자(김설문) 설문 — 내 설문/대시보드용
  mk({
    id: 201,
    ownerId: 1,
    title: '대학생 소비 습관 조사',
    description:
      '대학생이 무엇에, 어떤 기준으로 돈을 쓰는지 알아봅니다. 졸업 프로젝트 자료로 사용합니다.',
    externalUrl: 'https://forms.gle/myform1',
    category: '소비/트렌드',
    estMinutes: 2, // cost 1 → 사용한 크레딧 = 응답 수
    targetCount: 100,
    collectedCount: 27,
    proofRequired: true,
    status: 'ACTIVE',
    createdAt: ago(180),
  }),
  mk({ id: 202, ownerId: 1, title: '전공 만족도 조사', description: '학과 만족도 본조사.', externalUrl: 'https://forms.gle/myform2', category: '학업/전공', estMinutes: 2, targetCount: 80, collectedCount: 80, proofRequired: false, status: 'COMPLETED', createdAt: ago(60 * 24 * 4) }),
];

// 내 설문(201)이 받은 응답 — '받은 응답' 12개 (상호성 게이지 근거)
export const seedResponses: SurveyResponse[] = Array.from({ length: 12 }, (_, i) => ({
  id: 9100 + i,
  surveyId: 201,
  responderId: ((i % 4) + 2) as number,
  status: 'VERIFIED' as const,
  proofToken: null,
  startedAt: ago(300 - i * 12),
  completedAt: ago(295 - i * 12),
  creditedAt: ago(295 - i * 12),
  createdAt: ago(300 - i * 12),
}));

// 응답 크레딧 원장 (append-only) — 대표 샘플. 잔액(5)은 users.responseCredit 캐시.
export const seedCreditLedger: CreditLedgerEntry[] = [
  { id: 1, userId: 1, delta: 5, reason: 'SEED', refResponseId: null, createdAt: ago(60 * 24 * 12) },
  { id: 2, userId: 1, delta: 1, reason: 'EARN_RESPONSE', refResponseId: null, createdAt: ago(600) },
  { id: 3, userId: 1, delta: 1, reason: 'EARN_RESPONSE', refResponseId: null, createdAt: ago(400) },
  { id: 4, userId: 1, delta: -1, reason: 'SPEND_COLLECT', refResponseId: 9100, createdAt: ago(300) },
  { id: 5, userId: 1, delta: -1, reason: 'SPEND_COLLECT', refResponseId: 9101, createdAt: ago(288) },
];

export const seedAiCreditLedger: AiCreditLedgerEntry[] = [
  { id: 1, userId: 1, delta: 30, reason: 'PURCHASE', tokensUsed: null, refSessionId: null, createdAt: ago(60 * 24 * 6) },
  { id: 2, userId: 1, delta: -4, reason: 'SPEND_AUDIT', tokensUsed: 1820, refSessionId: 1, createdAt: ago(60 * 24 * 5) },
  { id: 3, userId: 1, delta: 2, reason: 'BRIDGE', tokensUsed: null, refSessionId: null, createdAt: ago(60 * 24 * 1) },
];

export const seedReports: Report[] = [];

// ── 자체 빌더 문항 (모든 설문은 앱 안에서 응답) ──
let __qid = 7000;
function qsFor(
  surveyId: number,
  defs: Array<
    Partial<Omit<SurveyQuestion, 'id' | 'surveyId' | 'position'>> &
      Pick<SurveyQuestion, 'type' | 'title'>
  >,
): SurveyQuestion[] {
  return defs.map((d, i) => ({
    id: ++__qid,
    surveyId,
    position: i,
    description: null,
    required: true,
    options: [],
    scaleMax: 5,
    scaleMinLabel: null,
    scaleMaxLabel: null,
    ...d,
  }));
}

export const seedSurveyQuestions: SurveyQuestion[] = [
  ...qsFor(101, [
    { type: 'single', title: '현재 아르바이트를 하고 있나요?', options: ['하고 있다', '쉬는 중이다', '해본 적 없다'] },
    { type: 'multi', title: '아르바이트를 하는(했던) 이유는? (복수 선택)', options: ['생활비', '용돈', '경험', '학비', '기타'] },
    { type: 'scale', title: '지금(마지막) 시급에 만족하나요?', scaleMinLabel: '매우 불만족', scaleMaxLabel: '매우 만족' },
    { type: 'short', title: '아르바이트에서 가장 힘들었던 점은?', required: false },
  ]),
  ...qsFor(102, [
    { type: 'single', title: '일주일에 카페를 몇 번 가나요?', options: ['거의 안 감', '1–2회', '3–4회', '5회 이상'] },
    { type: 'multi', title: '카페에서 주로 하는 일은? (복수 선택)', options: ['공부·과제', '수다', '휴식', '미팅', '혼자만의 시간'] },
    { type: 'scale', title: '카페 한 잔 가격이 적당하다고 느끼나요?', scaleMinLabel: '전혀', scaleMaxLabel: '매우' },
  ]),
  ...qsFor(103, [
    { type: 'single', title: '평소 운동 빈도는?', options: ['거의 안 함', '주 1–2회', '주 3–4회', '거의 매일'] },
    { type: 'single', title: '주로 하는 운동은?', options: ['헬스', '러닝·산책', '구기 종목', '홈트', '기타'] },
    { type: 'scale', title: '현재 체력에 만족하나요?', scaleMinLabel: '매우 불만족', scaleMaxLabel: '매우 만족' },
  ]),
  ...qsFor(104, [
    { type: 'multi', title: '구독 중인 서비스는? (복수 선택)', options: ['넷플릭스 등 OTT', '유튜브 프리미엄', '음악 스트리밍', '쿠팡·배송', '없음'] },
    { type: 'single', title: '한 달 구독 지출은?', options: ['없음', '1만원 미만', '1–3만원', '3만원 이상'] },
    { type: 'scale', title: '구독료가 부담된다고 느끼나요?', scaleMinLabel: '전혀', scaleMaxLabel: '매우' },
  ]),
  ...qsFor(105, [
    { type: 'single', title: 'AI 코딩 도구를 써본 적 있나요?', options: ['자주 쓴다', '가끔 쓴다', '없다'] },
    { type: 'multi', title: '어떤 도구를 쓰나요? (복수 선택)', options: ['ChatGPT', 'GitHub Copilot', 'Claude', 'Gemini', '기타'] },
    { type: 'scale', title: '학습에 도움이 된다고 느끼나요?', scaleMinLabel: '전혀', scaleMaxLabel: '매우' },
  ]),
  ...qsFor(106, [
    { type: 'single', title: '창업에 관심이 있나요?', options: ['매우 있다', '보통이다', '없다'] },
    { type: 'multi', title: '동아리에서 기대하는 점은? (복수 선택)', options: ['팀 빌딩', '멘토링', '자금·지원', '네트워킹', '실전 경험'] },
    { type: 'short', title: '해보고 싶은 아이템이 있다면 적어주세요.', required: false },
  ]),
  ...qsFor(107, [
    { type: 'single', title: '평소 점심은 주로 어디서 해결하나요?', options: ['학생식당', '교내 카페·편의점', '학교 근처 식당', '도시락·집밥', '거르는 편'] },
    { type: 'scale', title: '한 끼 점심 예산에 만족하나요?', scaleMinLabel: '매우 불만족', scaleMaxLabel: '매우 만족' },
    { type: 'multi', title: '점심 메뉴를 고를 때 중요하게 보는 것은? (복수 선택)', options: ['가격', '맛', '대기시간', '건강', '같이 먹는 사람'] },
    { type: 'short', title: '자주 가는 점심 맛집이 있다면 알려주세요.', required: false },
  ]),
  ...qsFor(201, [
    { type: 'single', title: '한 달 용돈은 얼마인가요?', options: ['20만원 미만', '20–40만원', '40–60만원', '60만원 이상'] },
    { type: 'multi', title: '지출이 큰 항목은? (복수 선택)', options: ['식비', '카페·간식', '쇼핑', '교통', '취미'] },
    { type: 'scale', title: '계획적으로 소비하는 편인가요?', scaleMinLabel: '전혀', scaleMaxLabel: '매우' },
  ]),
  ...qsFor(202, [
    { type: 'single', title: '전공 만족도는 어떤가요?', options: ['매우 만족', '만족', '보통', '불만족'] },
    { type: 'scale', title: '전공이 진로에 도움이 된다고 느끼나요?', scaleMinLabel: '전혀', scaleMaxLabel: '매우' },
  ]),
];
