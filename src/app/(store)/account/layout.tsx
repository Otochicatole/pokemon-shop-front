import type { ReactNode } from 'react';
import { AccountNav } from '@/features/account/ui/account-nav';
import styles from './layout.module.css';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <AccountNav />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
