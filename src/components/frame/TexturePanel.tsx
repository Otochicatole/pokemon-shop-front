import type { HTMLAttributes } from 'react';
import styles from './TexturePanel.module.css';

export function TexturePanel({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.texturePanel} texture-panel ${className}`.trim()} {...props}>{children}</div>;
}

