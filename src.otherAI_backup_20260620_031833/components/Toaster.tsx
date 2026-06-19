import { useToast } from '@/store/ui';
import styles from './Toaster.module.css';

// design_system.md §5 — 액티브 보이스 토스트. 이모지 절제.
export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.tone]}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
