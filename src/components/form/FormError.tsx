import styles from './FormError.module.css';

export function FormError({ children, className = '' }: { children: string; className?: string }) {
  return <p className={`${styles.formError} form-error ${className}`.trim()} role="alert">{children}</p>;
}

