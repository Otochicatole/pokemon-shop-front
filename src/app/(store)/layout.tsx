import { Footer } from '@/components/navigation';
import { StoreHeader } from '@/app/store-header';

export default function StoreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><StoreHeader /><main className="site-main">{children}</main><Footer /></>;
}
