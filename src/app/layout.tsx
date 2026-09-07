import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './globals.css';
import { Providers } from './providers';
import { StoreHeader } from './store-header';
import { Footer } from '@/components/navigation';

const geistSans = Geist({ variable: '--font-geist', subsets: ['latin'] });

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = { title: { default: 'Card Shop · Objetos para coleccionar', template: '%s · Card Shop' }, description: 'Cartas y productos sellados seleccionados para coleccionistas.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body className={`${geistSans.variable} ${geistMono.variable}`}><Providers><StoreHeader /><main className="site-main">{children}</main><Footer /></Providers></body></html>; }
