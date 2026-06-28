import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/Bits';
import { ErrorState, SkeletonList } from '@/components/Skeleton';
import { IconDownload } from '@/components/icons';
import { useSurveyResults } from '@/api/queries';
import {
  QUESTION_TYPE_LABEL,
  type SurveyQuestionResult,
  type SurveyResultValueCount,
} from '@/types/domain';
import styles from './SurveyResults.module.css';

interface ResultGroup {
  key: string;
  title: string;
  description: string | null;
  questions: SurveyQuestionResult[];
}

export function SurveyResults() {
  const { id } = useParams();
  const surveyId = Number(id);
  const { data: result, isLoading, isError, refetch } = useSurveyResults(surveyId);

  const print = () => window.print();

  if (isError) {
    return (
      <AppShell back title="설문 결과" hideNav>
        <ErrorState onRetry={() => refetch()} message="설문 결과를 불러오지 못했어요." />
      </AppShell>
    );
  }

  if (isLoading || !result) {
    return (
      <AppShell back title="설문 결과" hideNav>
        <SkeletonList count={3} />
      </AppShell>
    );
  }

  const groups = groupQuestions(result.sections, result.questions);
  const completionRate =
    result.survey.targetCount > 0
      ? Math.round((result.responseCount / result.survey.targetCount) * 100)
      : 0;

  return (
    <AppShell
      back
      title="설문 결과"
      hideNav
      action={
        <button className={`${styles.printBtn} ${styles.noPrint}`} onClick={print}>
          <IconDownload size={18} />
          PDF
        </button>
      }
    >
      <article className={styles.page}>
        <header className={styles.reportHead}>
          <p className={styles.kicker}>응답 결과</p>
          <h1 className={styles.title}>{result.survey.title}</h1>
          {result.survey.description && <p className={styles.desc}>{result.survey.description}</p>}
        </header>

        <section className={styles.summary} aria-label="결과 요약">
          <div className={styles.stat}>
            <span className="caption muted">응답 수</span>
            <strong className="num">{result.responseCount}</strong>
          </div>
          <div className={styles.stat}>
            <span className="caption muted">목표</span>
            <strong className="num">{result.survey.targetCount}</strong>
          </div>
          <div className={styles.stat}>
            <span className="caption muted">달성률</span>
            <strong className="num">{completionRate}%</strong>
          </div>
        </section>

        {result.responseCount === 0 ? (
          <EmptyState title="아직 저장된 응답이 없어요." body="응답이 제출되면 여기에서 결과를 볼 수 있어요." />
        ) : (
          <div className={styles.groups}>
            {groups.map((group) => (
              <section key={group.key} className={styles.section}>
                {group.title && (
                  <div className={styles.sectionHead}>
                    <h2>{group.title}</h2>
                    {group.description && <p>{group.description}</p>}
                  </div>
                )}
                <div className={styles.questions}>
                  {group.questions.map((question) => (
                    <QuestionResultCard key={question.questionId} question={question} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </article>
    </AppShell>
  );
}

function QuestionResultCard({ question }: { question: SurveyQuestionResult }) {
  const typeLabel = QUESTION_TYPE_LABEL[question.type];
  const hasOptionCounts = question.optionCounts.length > 0;
  const hasDistribution = question.distribution.length > 0;
  const hasTextAnswers = question.textAnswers.length > 0;

  return (
    <article className={styles.questionCard}>
      <div className={styles.questionHead}>
        <div>
          <p className={styles.type}>{typeLabel}</p>
          <h3>{question.title}</h3>
          {question.description && <p className={styles.questionDesc}>{question.description}</p>}
        </div>
        <span className={styles.answerCount}>
          <b className="num">{question.answerCount}</b>개
        </span>
      </div>

      {question.average !== null && (
        <div className={styles.average}>
          <span>평균</span>
          <strong className="num">{question.average}</strong>
        </div>
      )}

      {hasOptionCounts && <Bars items={question.optionCounts} unit={question.type === 'multi' ? '회' : '명'} />}
      {hasDistribution && <Bars items={sortedDistribution(question)} unit="명" />}
      {hasTextAnswers && <TextAnswers question={question} />}

      {!hasOptionCounts && !hasDistribution && !hasTextAnswers && (
        <p className={styles.noAnswers}>이 질문에는 아직 답변이 없어요.</p>
      )}
    </article>
  );
}

function Bars({ items, unit }: { items: SurveyResultValueCount[]; unit: string }) {
  return (
    <div className={styles.bars}>
      {items.map((item) => (
        <div key={item.value} className={styles.barRow}>
          <div className={styles.barMeta}>
            <span>{item.value}</span>
            <span className="num">
              {item.count}
              {unit} · {formatPercent(item.percentage)}
            </span>
          </div>
          <div className={styles.barTrack} aria-hidden>
            <div className={styles.barFill} style={{ width: `${Math.min(100, item.percentage)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TextAnswers({ question }: { question: SurveyQuestionResult }) {
  return (
    <ul className={styles.textAnswers}>
      {question.textAnswers.map((answer, index) => (
        <li key={`${answer.completedAt ?? 'answer'}-${index}`}>
          <p>{answer.value}</p>
          {answer.completedAt && <span>{formatDateTime(answer.completedAt)}</span>}
        </li>
      ))}
    </ul>
  );
}

function groupQuestions(
  sections: { id: number; title: string; description: string | null }[],
  questions: SurveyQuestionResult[],
): ResultGroup[] {
  const groups: ResultGroup[] = [];
  const looseQuestions = questions.filter((question) => question.sectionId === null);
  if (looseQuestions.length > 0) {
    groups.push({
      key: 'default',
      title: sections.length > 0 ? '기본 질문' : '',
      description: null,
      questions: looseQuestions,
    });
  }
  for (const section of sections) {
    const sectionQuestions = questions.filter((question) => question.sectionId === section.id);
    if (sectionQuestions.length === 0) continue;
    groups.push({
      key: `section-${section.id}`,
      title: section.title,
      description: section.description,
      questions: sectionQuestions,
    });
  }
  return groups;
}

function sortedDistribution(question: SurveyQuestionResult) {
  if (question.type !== 'date') return question.distribution;
  return [...question.distribution].sort((a, b) => a.value.localeCompare(b.value));
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace('.0', '')}%`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
