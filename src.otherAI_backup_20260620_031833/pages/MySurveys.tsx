import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { EmptyState, StatusBadge } from '@/components/Bits';
import { ErrorState, SkeletonList } from '@/components/Skeleton';
import { IconChevronRight, IconPlus } from '@/components/icons';
import { useMySurveys } from '@/api/queries';
import { estLabel, relativeTime } from '@/lib/format';
import type { Survey } from '@/types/domain';
import styles from './MySurveys.module.css';

// 내 설문 (mockup 9).
export function MySurveys() {
  const navigate = useNavigate();
  const { data: surveys, isLoading, isError, refetch } = useMySurveys();
  const [tab, setTab] = useState<'active' | 'done'>('active');

  const list = (surveys ?? []).filter((s) =>
    tab === 'active' ? s.status !== 'COMPLETED' : s.status === 'COMPLETED',
  );
  const summary = useMemo(() => {
    const all = surveys ?? [];
    return {
      active: all.filter((s) => s.status !== 'COMPLETED').length,
      done: all.filter((s) => s.status === 'COMPLETED').length,
      responses: all.reduce((sum, s) => sum + s.collectedCount, 0),
    };
  }, [surveys]);

  return (
    <AppShell
      title="내 설문"
      action={
        <button className={styles.createIcon} onClick={() => navigate('/surveys/new')} aria-label="설문 등록">
          <IconPlus size={20} />
        </button>
      }
    >
      {!isLoading && !isError && surveys && surveys.length > 0 && (
        <section className={styles.summary} aria-label="내 설문 요약">
          <SummaryItem label="진행 중" value={summary.active} suffix="개" />
          <SummaryItem label="누적 응답" value={summary.responses} suffix="명" strong />
          <SummaryItem label="완료" value={summary.done} suffix="개" />
        </section>
      )}

      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'active'}
          className={`${styles.tab} ${tab === 'active' ? styles.tabOn : ''}`}
          onClick={() => setTab('active')}
        >
          진행중
        </button>
        <button
          role="tab"
          aria-selected={tab === 'done'}
          className={`${styles.tab} ${tab === 'done' ? styles.tabOn : ''}`}
          onClick={() => setTab('done')}
        >
          종료됨
        </button>
      </div>

      {isLoading ? (
        <SkeletonList count={2} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? '진행 중인 설문이 없어요.' : '종료된 설문이 없어요.'}
          body={tab === 'active' ? '아래 버튼으로 첫 설문을 올려보세요.' : undefined}
        />
      ) : (
        <ul className={styles.list}>
          {list.map((s) => (
            <SurveyRow key={s.id} survey={s} onOpen={() => navigate(`/surveys/${s.id}`)} />
          ))}
        </ul>
      )}

    </AppShell>
  );
}

function SurveyRow({ survey, onOpen }: { survey: Survey; onOpen: () => void }) {
  const remain = Math.max(0, survey.targetCount - survey.collectedCount);
  const pct =
    survey.targetCount > 0
      ? Math.min(100, Math.round((survey.collectedCount / survey.targetCount) * 100))
      : 0;
  const usedCredit = survey.collectedCount * survey.costPerResponse;
  const done = survey.status === 'COMPLETED';
  const tone = done ? styles.cardDone : survey.status === 'PAUSED' ? styles.cardPaused : styles.cardActive;

  return (
    <li className={`${styles.card} ${tone}`}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={styles.category}>{survey.category ?? '기타'}</span>
          <StatusBadge status={survey.status} />
          <span className={styles.age}>{relativeTime(survey.createdAt)}</span>
        </div>
        <button className={styles.openIcon} onClick={onOpen} aria-label="설문 상세 보기">
          <IconChevronRight size={18} />
        </button>
      </div>

      <button className={styles.titleButton} onClick={onOpen}>
        <span className={styles.cardTitle}>{survey.title}</span>
      </button>
      {survey.description && <p className={styles.description}>{survey.description}</p>}

      <div className={styles.progressPanel}>
        <div className={styles.progressHead}>
          <span>
            응답 <b className="num">{survey.collectedCount}</b>/<b className="num">{survey.targetCount}</b>명
          </span>
          <span className={`sm ${styles.pct}`}>{pct}%</span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={survey.collectedCount}
          aria-valuemax={survey.targetCount}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className={styles.goalText}>
          {done ? '목표 응답 수집이 완료됐어요' : `응답 목표까지 ${remain}명 남았어요`}
        </p>
      </div>

      <div className={styles.boxes}>
        <Metric label="사용 크레딧" value={usedCredit} suffix="개" />
        <Metric label={done ? '최종 응답' : '남은 목표'} value={done ? survey.collectedCount : remain} suffix="명" />
        <div className={styles.box}>
          <span className="caption muted">소요 시간</span>
          <span className={styles.boxNum}>{estLabel(survey.estMinutes)}</span>
        </div>
      </div>

      <button className={styles.respondentsBtn} onClick={onOpen}>
        <span>
          <b>응답자 현황 확인</b>
          <small>제출 추이를 보고 설문을 관리하세요</small>
        </span>
        <IconChevronRight size={17} />
      </button>
    </li>
  );
}

function SummaryItem({
  label,
  value,
  suffix,
  strong,
}: {
  label: string;
  value: number;
  suffix: string;
  strong?: boolean;
}) {
  return (
    <div className={`${styles.summaryItem} ${strong ? styles.summaryStrong : ''}`}>
      <span className="caption">{label}</span>
      <b>
        <span className="num">{value}</span>
        {suffix}
      </b>
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className={styles.box}>
      <span className="caption muted">{label}</span>
      <span className={styles.boxNum}>
        <span className="num">{value}</span>
        {suffix}
      </span>
    </div>
  );
}
