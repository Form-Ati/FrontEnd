import { useRef } from 'react';
import { useConfirmStore } from '@/store/confirm';
import { Button } from './Button';
import { useModalBehavior } from './modal';
import styles from './ConfirmDialog.module.css';

// 전역 확인 다이얼로그 호스트. main.tsx 에 한 번 렌더.
export function ConfirmHost() {
  const open = useConfirmStore((s) => s.open);
  const options = useConfirmStore((s) => s.options);
  const settle = useConfirmStore((s) => s.settle);
  const ref = useRef<HTMLDivElement>(null);
  useModalBehavior(ref, () => settle(false));

  if (!open || !options) return null;
  const { title, body, confirmLabel = '확인', cancelLabel = '취소', tone = 'default' } = options;

  return (
    <div className={styles.scrim} onClick={() => settle(false)}>
      <div
        ref={ref}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={body ? 'confirm-body' : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className={styles.title}>
          {title}
        </h2>
        {body && (
          <p id="confirm-body" className={styles.body}>
            {body}
          </p>
        )}
        <div className={styles.actions}>
          <Button variant="secondary" full onClick={() => settle(false)}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} full onClick={() => settle(true)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
