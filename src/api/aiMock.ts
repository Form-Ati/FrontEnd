// AI 기능 더미 구현 — develop_system.md §4.4 의 JSON 스키마를 그대로 따른다.
// 백엔드에서 실제 LLM 호출로 교체될 자리. 여기선 규칙 기반으로 그럴듯하게 흉내낸다.
import type { AuditResult, GeneratedQuestion } from '@/types/domain';

// C1 목표 정련 — "OO 알고 싶어요" → 되묻고, 연구질문으로 정련
export function runRefine(goal: string): { questions: string[]; researchQuestion: string } {
  const topic = goal.replace(/(에 대해|에 대한|을|를|이|가|알고 싶어요|궁금해요)/g, '').trim() || '주제';
  return {
    questions: [
      `누구를 대상으로 알고 싶나요? (예: 우리 학교 재학생 / 20대 전체)`,
      `검증하려는 가설이 있나요, 아니면 탐색적으로 살펴보는 단계인가요?`,
      `"${topic}"에서 가장 궁금한 핵심 한 가지는 무엇인가요?`,
      `의사결정에 쓸 결과인가요? (예: 기능 출시 여부 판단)`,
    ],
    researchQuestion: `${topic}에 대한 대학생의 인식과 행동 패턴은 어떠하며, 이는 어떤 요인과 관련되는가?`,
  };
}

// C2 문항 생성 — 객관식/리커트/주관식 믹스
export function runGenerate(researchQuestion: string): { questions: GeneratedQuestion[] } {
  const t = researchQuestion.slice(0, 18);
  return {
    questions: [
      { type: 'single', text: '귀하의 학년은 어떻게 되시나요?', options: ['1학년', '2학년', '3학년', '4학년', '5학년 이상'] },
      {
        type: 'likert',
        text: `“${t}…” 관련 활동에 평소 관심이 있다.`,
        options: ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'],
      },
      {
        type: 'multi',
        text: '관련 정보를 주로 어디서 얻나요? (복수 선택)',
        options: ['에브리타임', '인스타그램', '유튜브', '지인/친구', '검색'],
      },
      { type: 'likert', text: '현재 제공되는 선택지에 만족한다.', options: ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'] },
      { type: 'open', text: '개선되면 좋겠다고 느낀 점을 자유롭게 적어주세요.' },
    ],
  };
}

// C3 편향 감수 (시그니처) — 문항 텍스트에서 결함 탐지. §4.4 JSON 스키마 준수.
export function runAudit(questions: string[]): AuditResult {
  const issues: AuditResult['issues'] = [];
  questions.forEach((qRaw, index) => {
    const q = qRaw.trim();
    if (!q) return;

    // leading — 유도 질문
    if (/(당연히|좋은|훌륭한|편리한|얼마나 좋|동의하지 않|않나요\??$)/.test(q)) {
      issues.push({
        index,
        type: 'leading',
        reason: '응답자를 특정 답으로 유도하는 표현이 들어 있어요.',
        suggestion: '가치판단 형용사를 빼고 중립적으로: “…에 대해 어떻게 생각하시나요?”',
      });
    }
    // double_barreled — 이중 질문 (그리고/및/와)
    if (/(그리고|및|·|,).*(나요|니까|습니까|가요)/.test(q) || /(\S+와\s\S+).*(만족)/.test(q)) {
      issues.push({
        index,
        type: 'double_barreled',
        reason: '한 문항에서 두 가지를 동시에 묻고 있어 응답이 모호해질 수 있어요.',
        suggestion: '두 개의 독립 문항으로 분리하세요.',
      });
    }
    // ambiguous — 모호한 어휘
    if (/(자주|가끔|보통|적당히|종종|많이)\s/.test(q)) {
      issues.push({
        index,
        type: 'ambiguous',
        reason: '“자주/가끔” 같은 빈도 표현은 사람마다 기준이 달라요.',
        suggestion: '구체적 빈도로: “주 몇 회 사용하시나요? (0회 / 1–2회 / 3–4회 / 5회 이상)”',
      });
    }
    // missing_option — 누락된 보기 (예/아니오 양자택일)
    if (/(예\/아니|예 또는 아니|있다\/없다)/.test(q)) {
      issues.push({
        index,
        type: 'missing_option',
        reason: '“잘 모르겠다 / 해당 없음” 보기가 빠지면 응답이 왜곡될 수 있어요.',
        suggestion: '중립·회피 보기를 추가하세요: “잘 모르겠다”, “해당 없음”.',
      });
    }
    // scale_imbalance — 척도 불균형
    if (/(매우 좋|좋음|보통).*(나쁨)?/.test(q) && /(매우 좋|아주 만족)/.test(q) && !/(매우 나쁨|아주 불만족)/.test(q)) {
      issues.push({
        index,
        type: 'scale_imbalance',
        reason: '긍정 보기에 비해 부정 보기가 적어 척도가 한쪽으로 기울어요.',
        suggestion: '긍정/부정 보기 수를 대칭으로 맞추세요 (예: 5점 양극 척도).',
      });
    }
  });
  return { issues };
}
