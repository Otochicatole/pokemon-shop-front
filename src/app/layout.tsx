import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './globals.css';
import { Providers } from './providers';
import { config, siteDescription } from '@/shared/config/env';

const geistSans = Geist({ variable: '--font-geist', subsets: ['latin'] });

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: {
    default: `${config.storeName} · Cartas Pokémon y coleccionables`,
    template: `%s · ${config.storeName}`,
  },
  description: siteDescription,
  applicationName: config.storeName,
  authors: [{ name: config.storeName, url: config.siteUrl }],
  creator: config.storeName,
  publisher: config.storeName,
  keywords: [
    'Nevadatcg',
    'cartas Pokémon',
    'TCG',
    'Pokémon TCG',
    'productos sellados',
    'sobres Pokémon',
    'cartas sueltas',
    'accesorios TCG',
    'tienda Pokémon Argentina',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: config.siteUrl,
    siteName: config.storeName,
    title: `${config.storeName} · Cartas Pokémon y coleccionables`,
    description: siteDescription,
    images: [{ url: '/logo.svg', alt: `${config.storeName} logo` }],
  },
  twitter: {
    card: 'summary',
    title: `${config.storeName} · Cartas Pokémon y coleccionables`,
    description: siteDescription,
    images: ['/logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [{ url: '/logo.svg', type: 'image/svg+xml' }],
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  category: 'shopping',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
