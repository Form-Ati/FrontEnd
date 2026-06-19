import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import styles from './Field.module.css';

// design_system.md §4.5 — 라벨은 위에, placeholder는 예시만, 에러는 하단에 무엇이/왜/어떻게.
interface Wrap {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}
export function FieldWrap({ label, hint, error, children, htmlFor }: Wrap) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}
export const TextField = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, id, ...rest }, ref) => (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={id}>
      <input
        id={id}
        ref={ref}
        className={`${styles.input} ${error ? styles.invalid : ''}`}
        aria-invalid={!!error}
        {...rest}
      />
    </FieldWrap>
  ),
);
TextField.displayName = 'TextField';

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}
export const TextArea = forwardRef<HTMLTextAreaElement, AreaProps>(
  ({ label, hint, error, id, ...rest }, ref) => (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={id}>
      <textarea
        id={id}
        ref={ref}
        className={`${styles.input} ${styles.area} ${error ? styles.invalid : ''}`}
        aria-invalid={!!error}
        {...rest}
      />
    </FieldWrap>
  ),
);
TextArea.displayName = 'TextArea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: readonly string[];
}
export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, id, options, ...rest }, ref) => (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={id}>
      <select
        id={id}
        ref={ref}
        className={`${styles.input} ${styles.select} ${error ? styles.invalid : ''}`}
        aria-invalid={!!error}
        {...rest}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldWrap>
  ),
);
SelectField.displayName = 'SelectField';
