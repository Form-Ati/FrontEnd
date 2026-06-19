import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { QuestionView, type AnswerValue } from '@/components/QuestionView';
import { useCompleteResponse, useSurvey, useSurveyQuestions } from '@/api/queries';
import { api } from '@/api/mockApi';
import { ApiError } from '@/api/errors';
import { useDb } from '@/store/db';
import { useToast } from '@/store/ui';
import styles from './SurveyFill.module.css';

const isEmpty = (v: AnswerValue | undefined) =>
  v === undefined || (Array.isArray(v) ? v.length === 0 : v.trim() === '');

// 자체 빌더 설문 — 앱 안에서 직접 응답 (구글폼 응답 화면 레퍼런스).
export function SurveyFill() {
  const { id } = useParams();
  const surveyId = Number(id);
  const navigate = useNavigate();
  const { data: survey } = useSurvey(surveyId);
  const { data: questions } = useSurveyQuestions(surveyId);
  const complete = useCompleteResponse();
  const push = useToast((s) => s.push);

  const pending = useDb((s) =>
    s.responses.find(
      (r) => r.surveyId === surveyId && r.responderId === s.currentUserId && r.status === 'PENDING',
    ),
  );

  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [errorIdx, setErrorIdx] = useState<Set<number>>(new Set());

  // 직접 진입한 경우에도 응답 시작(체류시간 기록)
  useEffect(() => {
    if (survey && !pending) api.startResponse(surveyId).catch(() => {});
  }, [survey, pending, surveyId]);

  if (!survey || !questions) {
    return (
      <AppShell back title="설문 응답" hideNav>
        <div className={styles.loading} />
      </AppShell>
    );
  }

  const setAnswer = (idx: number, v: AnswerValue) =>
    setAnswers((a) => ({ ...a, [idx]: v }));

  const submit = async () => {
    const missing = new Set<number>();
    questions.forEach((q, i) => {
      if (q.required && isEmpty(answers[i])) missing.add(i);
    });
    if (missing.size) {
      setErrorIdx(missing);
      push('필수 질문에 답해 주세요.', 'warning');
      return;
    }
    setErrorIdx(new Set());
    try {
      const res = await complete.mutateAsync({ surveyId });
      navigate(`/surveys/${surveyId}/done`, { replace: true, state: { reward: res.reward } });
    } catch (e) {
      if (e instanceof ApiError) push(e.message, 'warning');
    }
  };

  return (
    <AppShell back title="설문 응답" hideNav>
      <div className={styles.formHead}>
        <h1 className={styles.title}>{survey.title}</h1>
        {survey.description && <p className={styles.desc}>{survey.description}</p>}
        <p className={styles.reqNote}>* 표시는 필수 질문이에요.</p>
      </div>

      <div className={styles.list}>
        {questions.map((q, i) => (
          <QuestionView
            key={q.id}
            question={q}
            index={i}
            value={answers[i] ?? (q.type === 'multi' ? [] : '')}
            onChange={(v) => setAnswer(i, v)}
            error={errorIdx.has(i)}
          />
        ))}
      </div>

      <div className={styles.submit}>
        <Button size="lg" full loading={complete.isPending} onClick={submit}>
          제출하고 크레딧 받기
        </Button>
        <p className={styles.hint}>제출하면 +{survey.costPerResponse} 크레딧이 적립돼요.</p>
      </div>
    </AppShell>
  );
}
