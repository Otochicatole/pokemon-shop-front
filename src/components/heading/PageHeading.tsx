import type { ReactNode } from 'react';
import { SectionHeading, type SectionHeadingProps } from './SectionHeading';

export function PageHeading(props: Omit<SectionHeadingProps, 'level'> & { action?: ReactNode; className?: string }) {
  const { className = '', ...headingProps } = props;
  return <div className={className}><SectionHeading {...headingProps} level="h1" /></div>;
}
