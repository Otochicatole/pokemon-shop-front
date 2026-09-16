import type { ReactNode } from 'react';
import styles from './SectionHeading.module.css';

export interface SectionHeadingProps { eyebrow?: string; title: string; description?: string; action?: ReactNode; level?: 'h1' | 'h2' | 'h3'; className?: string; }

export function SectionHeading({ eyebrow, title, description, action, level = 'h2', className = '' }: SectionHeadingProps) {
  const Heading = level;
  return (
    <div className={`${styles.sectionHeading} section-heading heading-row ${className}`.trim()}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

