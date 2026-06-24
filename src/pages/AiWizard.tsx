import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconClose, IconCheck } from '@/components/icons';
import { Stepper } from '@/components/Stepper';
import { Button } from '@/components/Button';
import { Card } from '@/components/Bits';
import { api } from '@/api/api';
import { ApiError } from '@/api/errors';
import { useInvalidateAll } from '@/api/queries';
import { useToast } from '@/store/ui';
import type { AuditIssue, GeneratedQuestion } from '@/types/domain';
import styles from './AiWizard.module.css';

const ISSUE_LABEL: Record<AuditIssue['type'], string> = {
  leading: '유도질문 가능성',
  double_barreled: '이중질문 가능성',
  ambiguous: '모호한 어휘 가능성',
  missing_option: '보기 누락 가능성',
  scale_imbalance: '척도 불균형 가능성',
};
const Q_TYPE: Record<GeneratedQuestion['type'], string> = {
  single: '객관식',
  multi: '복수선택',
  likert: '리커트',
  open: '주관식',
};

// AI 설문 설계 — 4단계 (mockup 10, 11). C1 정련 → C2 생성 → C3 감수 → 완료.
export function AiWizard() {
  const navigate = useNavigate();
  const invalidate = useInvalidateAll();
  const push = useToast((s) => s.push);

  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [researchQuestion, setRq] = useState('');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [busy, setBusy] = useState(false);

  const refine = async () => {
    setBusy(true);
    try {
      const res = await api.aiRefine(topic);
      setRq(res.researchQuestion);
      const gen = await api.aiGenerate(res.researchQuestion);
      setQuestions(gen.questions);
      invalidate();
      setStep(2);
    } catch (e) {
      if (e instanceof ApiError) push(e.message, 'warning');
    } finally {
      setBusy(false);
    }
  };

  const audit = async () => {
    setBusy(true);
    try {
      const res = await api.aiAudit(questions.map((q) => q.text));
      setIssues(res.issues);
      invalidate();
      setStep(3);
    } catch (e) {
      if (e instanceof ApiError) push(e.message, 'warning');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.icon} onClick={() => navigate('/home')} aria-label="닫기">
          <IconClose />
        </button>
        <span className={styles.headerTitle}>AI 설문 설계</span>
        <span className={styles.icon} />
      </header>

      <div className={styles.body}>
        <Stepper current={step} total={4} />

        {step === 1 && (
          <>
            <h1 className={styles.title}>
              어떤 주제를
              <br />
              조사하고 싶으세요?
            </h1>
            <p className={styles.sub}>궁금한 점을 자유롭게 적어주세요. AI가 더 좋은 질문을 만들어드려요.</p>
            <div className={styles.textareaWrap}>
              <textarea
                className={styles.textarea}
                maxLength={200}
                placeholder="예) 대학생의 카페 이용 빈도와 만족도에 대해 알고 싶어요."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <span className={styles.counter}>{topic.length}/200</span>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className={styles.title}>AI 추천 문항</h1>
            <p className={styles.sub}>정련된 연구질문으로 문항을 만들었어요.</p>
            <div className={styles.rqBox}>{researchQuestion}</div>
            <div className={styles.qList}>
              {questions.map((q, i) => (
                <div key={i} className={styles.qCard}>
                  <div className={styles.qHead}>
                    <span className={styles.qNum}>Q{i + 1}</span>
                    <span className={styles.qType}>{Q_TYPE[q.type]}</span>
                  </div>
                  <p className={styles.qText}>{q.text}</p>
                  {q.options && (
                    <ul className={styles.options}>
                      {q.options.map((o, j) => (
                        <li key={j}>{o}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className={styles.title}>AI 감수 결과</h1>
            <p className={styles.sub}>설문의 문제점을 발견했어요.</p>
            {issues.length === 0 ? (
              <Card className={styles.clean}>
                <p className="h3">눈에 띄는 결함이 없어요.</p>
                <p className="sm muted">문항이 중립적이고 명료해요.</p>
              </Card>
            ) : (
              <div className={styles.issues}>
                {issues.map((issue, i) => (
                  <div key={i} className={styles.issue}>
                    <div className={styles.issueHead}>
                      <span className={styles.warnMark} aria-hidden>
                        !
                      </span>
                      <span className={styles.issueTitle}>{ISSUE_LABEL[issue.type]}</span>
                    </div>
                    <p className={styles.issueQuote}>“{questions[issue.index]?.text}”</p>
                    <p className={styles.issueReason}>{issue.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <div className={styles.doneWrap}>
            <div className={styles.doneMark}>
              <IconCheck size={30} />
            </div>
            <h1 className={styles.title}>설문이 준비됐어요</h1>
            <p className={styles.sub}>감수까지 마친 문항으로 설문을 올려보세요.</p>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {step === 1 && (
          <Button size="lg" full loading={busy} disabled={topic.trim().length < 5} onClick={refine}>
            다음
          </Button>
        )}
        {step === 2 && (
          <div className={styles.row}>
            <Button size="lg" variant="secondary" onClick={() => setStep(1)}>
              이전
            </Button>
            <Button size="lg" full loading={busy} onClick={audit}>
              감수 받기
            </Button>
          </div>
        )}
        {step === 3 && (
          <div className={styles.row}>
            <Button size="lg" variant="secondary" onClick={() => setStep(2)}>
              수정하기
            </Button>
            <Button size="lg" full onClick={() => setStep(4)}>
              다음
            </Button>
          </div>
        )}
        {step === 4 && (
          <Button size="lg" full onClick={() => navigate('/surveys/new')}>
            설문 올리러 가기
          </Button>
        )}
      </div>
    </div>
  );
}
