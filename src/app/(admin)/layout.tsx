import './admin.css';
import styles from './layout.module.css';

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-root">{children}</div>;
}
