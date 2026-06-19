import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'sm';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  children: ReactNode;
}

// design_system.md §4.1 버튼. 최소 터치 영역 48×48, hover=darken, active=scale(0.98).
export function Button({
  variant = 'primary',
  size = 'md',
  full,
  loading,
  children,
  className,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        full ? styles.full : '',
        className ?? '',
      ].join(' ')}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      <span className={loading ? styles.dim : ''}>{children}</span>
    </button>
  );
}
