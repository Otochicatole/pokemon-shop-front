import { Footer } from '@/components/navigation';
import { StoreHeader } from '@/app/store-header';
import './storefront.css';

export default function StoreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="storefront"><a className="skip-link" href="#main-content">Saltar al contenido</a><StoreHeader /><main id="main-content" className="site-main" tabIndex={-1}>{children}</main><Footer /></div>;
}
