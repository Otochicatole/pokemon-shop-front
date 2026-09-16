import type { HTMLAttributes } from 'react';
import styles from './ProductTile.module.css';

export function ProductTile({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={`${styles.productTile} product-card product-tile ${className}`.trim()} {...props}>{children}</article>;
}

