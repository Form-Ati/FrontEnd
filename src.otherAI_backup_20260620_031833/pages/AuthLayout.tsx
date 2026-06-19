import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack } from '@/components/icons';
import styles from './Auth.module.css';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)} aria-label="뒤로">
        <IconBack />
      </button>
      <div className={styles.inner}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <div className={styles.form}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
