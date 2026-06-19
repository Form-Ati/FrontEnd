import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { EmptyState, ProgressBar, StatusBadge } from '@/components/Bits';
import { ErrorState, SkeletonList } from '@/components/Skeleton';
import { IconPlus } from '@/components/icons';
import { useMySurveys } from '@/api/queries';
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

  return (
    <AppShell title="내 설문">
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

      <button className={styles.fab} onClick={() => navigate('/surveys/new')}>
        <IconPlus size={18} /> 설문 등록
      </button>
    </AppShell>
  );
}

function SurveyRow({ survey, onOpen }: { survey: Survey; onOpen: () => void }) {
  const remain = Math.max(0, survey.targetCount - survey.collectedCount);
  const pct = Math.round((survey.collectedCount / survey.targetCount) * 100);
  const usedCredit = survey.collectedCount * survey.costPerResponse;
  const done = survey.status === 'COMPLETED';

  return (
    <li className={styles.card}>
      <button className={styles.cardHead} onClick={onOpen}>
        <span className={styles.cardTitle}>{survey.title}</span>
        <StatusBadge status={survey.status} />
      </button>

      <div className={styles.metaLine}>
        <span className="sm muted">
          목표 <b className="num">{survey.targetCount}</b>명 · 응답{' '}
          <b className="num">{survey.collectedCount}</b>명
        </span>
        <span className={`sm ${styles.pct}`}>{pct}%</span>
      </div>
      <ProgressBar value={survey.collectedCount} max={survey.targetCount} />

      {!done && (
        <div className={styles.boxes}>
          <div className={styles.box}>
            <span className="caption muted">사용한 크레딧</span>
            <span className={styles.boxNum}>
              <span className="num">{usedCredit}</span>개
            </span>
          </div>
          <div className={styles.box}>
            <span className="caption muted">남은 목표</span>
            <span className={styles.boxNum}>
              <span className="num">{remain}</span>명
            </span>
          </div>
        </div>
      )}

      <button className={styles.respondentsBtn} onClick={onOpen}>
        응답자 현황 보기
      </button>
    </li>
  );
}
