import './admin-keyframes.css';
import styles from './layout.module.css';

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={styles.adminRoot}>{children}</div>;
}
