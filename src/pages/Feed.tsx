import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { SurveyCard } from '@/components/SurveyCard';
import { EmptyState } from '@/components/Bits';
import { ErrorState, SkeletonList } from '@/components/Skeleton';
import { IconBell } from '@/components/icons';
import { useFeed } from '@/api/queries';
import { useToast } from '@/store/ui';
import type { Survey } from '@/types/domain';
import styles from './Feed.module.css';

type Sort = '전체' | '최신순' | '인기순' | '짧은순';
const SORTS: Sort[] = ['전체', '최신순', '인기순', '짧은순'];

export function Feed() {
  const { data: surveys, isLoading, isError, refetch } = useFeed(0);
  const push = useToast((s) => s.push);
  const [sort, setSort] = useState<Sort>('전체');

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
              <SurveyCard survey={s} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
