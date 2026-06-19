import { useRef, type ReactNode } from 'react';
import { useModalBehavior } from './modal';
import styles from './Sheet.module.css';

// 접근성 있는 바텀 시트 — 포커스 트랩 + ESC + 스크롤 잠금 + 백드롭 닫기.
// open 일 때만 마운트해서 사용한다(훅이 조건부로 실행되지 않도록).
export function Sheet({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalBehavior(ref, onClose);

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        ref={ref}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.grip} aria-label="닫기" onClick={onClose} />
        {children}
      </div>
    </div>
  );
}
