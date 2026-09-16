import { NewsManagementView } from '@/features/news';
import styles from './page.module.css';

export const metadata = { title: 'Noticias · CMS' };

export default function NewsPage() {
  return <NewsManagementView />;
}
