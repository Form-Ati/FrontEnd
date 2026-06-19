import styles from './Stepper.module.css';

// AI 설문 설계 4단계 진행 표시 (mockup).
export function Stepper({ current, total = 4 }: { current: number; total?: number }) {
  return (
    <ol className={styles.stepper} aria-label={`${total}단계 중 ${current}단계`}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={step} className={styles.item}>
            <span
              className={`${styles.dot} ${done ? styles.done : ''} ${active ? styles.active : ''}`}
            >
              {step}
            </span>
            {step < total && (
              <span className={`${styles.line} ${done ? styles.lineDone : ''}`} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
