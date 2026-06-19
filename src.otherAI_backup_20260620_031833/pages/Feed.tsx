import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { SurveyCard } from '@/components/SurveyCard';
import { EmptyState } from '@/components/Bits';
import { ErrorState, SkeletonList } from '@/components/Skeleton';
import { IconBell } from '@/components/icons';
import { useFeed } from '@/api/queries';
import { useDb } from '@/store/db';
import { useToast } from '@/store/ui';
import type { Survey } from '@/types/domain';
import styles from './Feed.module.css';

type Sort = '전체' | '최신순' | '인기순' | '짧은순';
const SORTS: Sort[] = ['전체', '최신순', '인기순', '짧은순'];

export function Feed() {
  const { data: surveys, isLoading, isError, refetch } = useFeed(0);
  const users = useDb((s) => s.users);
  const push = useToast((s) => s.push);
  const [sort, setSort] = useState<Sort>('전체');

  const summary = useMemo(() => {
    const list = surveys ?? [];
    const avgReward = list.length
      ? Math.round(list.reduce((sum, s) => sum + s.costPerResponse, 0) / list.length)
      : 0;
    return {
      total: list.length,
      short: list.filter((s) => s.estMinutes <= 3).length,
      avgReward,
      rewards: list.reduce((sum, s) => sum + s.costPerResponse, 0),
    };
  }, [surveys]);

  const sorted = useMemo(() => {
    const list = [...(surveys ?? [])];
    const by: Record<Sort, (a: Survey, b: Survey) => number> = {
      전체: () => 0, // api.feed 의 가중 정렬 유지
      최신순: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      인기순: (a, b) => b.collectedCount - a.collectedCount,
      짧은순: (a, b) => a.estMinutes - b.estMinutes,
    };
    return list.sort(by[sort]);
  }, [surveys, sort]);

  return (
    <AppShell
      title="설문 피드"
      action={
        <button
          className={styles.bell}
          aria-label="알림"
          onClick={() => push('새 알림이 없어요.', 'default')}
        >
          <IconBell />
        </button>
      }
    >
      {!isLoading && !isError && (surveys?.length ?? 0) > 0 && (
        <section className={styles.overview} aria-label="피드 요약">
          <div className={styles.overviewMain}>
            <span className={styles.overviewLabel}>오늘 참여 가능한 설문</span>
            <strong className="num">{summary.total}</strong>
            <p>짧게 답하고 크레딧을 받아보세요</p>
          </div>
          <div className={styles.overviewStats}>
            <span>
              <b className="num">{summary.short}</b>
              <small>3분 이하</small>
            </span>
            <span>
              <b className="num">+{summary.avgReward}</b>
              <small>평균 보상</small>
            </span>
            <span>
              <b className="num">+{summary.rewards}</b>
              <small>전체 보상</small>
            </span>
          </div>
        </section>
      )}

      <div className={styles.tabs} role="tablist" aria-label="정렬">
        {SORTS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={sort === s}
            className={`${styles.tab} ${sort === s ? styles.tabOn : ''}`}
            onClick={() => setSort(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList count={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="지금은 응답할 설문이 없어요."
          body="잠시 후 다시 와주세요. 새 설문이 올라오면 여기 채워집니다."
        />
      ) : (
        <ul className={styles.list}>
          {sorted.map((s) => (
            <li key={s.id}>
              <SurveyCard survey={s} owner={users.find((u) => u.id === s.ownerId)} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
