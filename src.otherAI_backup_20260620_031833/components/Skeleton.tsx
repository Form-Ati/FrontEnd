import type { CSSProperties } from 'react';
import { Button } from './Button';
import styles from './Skeleton.module.css';

// 일관된 로딩 플레이스홀더. prefers-reduced-motion 에서는 셔머 정지(global.css).
export function Skeleton({
  height = 16,
  width = '100%',
  radius = 'var(--radius-sm)',
  style,
}: {
  height?: number | string;
  width?: number | string;
  radius?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={styles.sk}
      style={{ height, width, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}

// 카드형 스켈레톤(피드/목록 공용)
export function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden>
      <Skeleton height={18} width="70%" />
      <Skeleton height={14} width="40%" />
      <div className={styles.row}>
        <Skeleton height={24} width={64} radius="var(--radius-full)" />
        <Skeleton height={24} width={72} radius="var(--radius-full)" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.list} role="status" aria-label="불러오는 중">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// 조회 실패 시 재시도 UI
export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className={styles.error} role="alert">
      <p className="h3">잠시 문제가 생겼어요</p>
      <p className="sm muted">{message ?? '네트워크를 확인하고 다시 시도해 주세요.'}</p>
      <Button variant="secondary" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
