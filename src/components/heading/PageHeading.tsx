import type { ReactNode } from 'react';
import { SectionHeading, type SectionHeadingProps } from './SectionHeading';
import styles from './PageHeading.module.css';

export function PageHeading(props: Omit<SectionHeadingProps, 'level'> & { action?: ReactNode; className?: string }) {
  const { className = '', ...headingProps } = props;
  return <div className={`${styles.pageHeading} ${className}`.trim()}><SectionHeading {...headingProps} level="h1" /></div>;
}

