import './admin-keyframes.css';
import type { Metadata } from 'next';
import styles from './layout.module.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={styles.adminRoot}>{children}</div>;
}
