/**
 * @file App layout
 * @module AppLayout
 */

import '@/app/_styles/global.css';

import {
  Space_Grotesk,
  Inter,
  JetBrains_Mono,
  Sora,
  Lora,
} from 'next/font/google';
import { Suspense } from 'react';
import AsyncHeader from './_components/sections/AsyncHeader';
import AsyncFooter from './_components/sections/AsyncFooter';
import TopProgressBar from './_components/ui/TopProgressBar';
import ToasterProvider from './_components/ui/ToasterProvider';
import { UserRoleProvider } from './_components/ui/UserRoleProvider';
import NavbarSkeleton from './_components/ui/NavbarSkeleton';
import AppShell from './_components/ui/AppShell';
import PageTransition from './_components/motion/PageTransition';
import { auth } from '@/app/_lib/auth';

import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  BASE_KEYWORDS,
} from '@/app/_lib/seo';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-heading',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-sora',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata = {
  title: {
    default: `${SITE_TITLE} (${SITE_NAME})`,
    template: `%s - ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: BASE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_TITLE,
  publisher: SITE_TITLE,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Uncomment and fill in when verification codes are available:
  // verification: {
  //   google: 'your-google-site-verification-code',
  //   yandex: 'your-yandex-verification-code',
  //   bing: 'your-bing-verification-code',
  // },
  category: 'education',
  other: {
    'theme-color': '#05060B',
  },
};

export default async function RootLayout({ children }) {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.warn('[layout] auth() failed, continuing as unauthenticated:', error?.message);
  }

  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${sora.variable} ${lora.variable}`}
      style={{ colorScheme: 'dark' }}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body
        className={`${inter.className} bg-background-dark text-primary-50 flex min-h-screen flex-col`}
      >
        <TopProgressBar />
        <ToasterProvider />
        <AppShell>
          <div data-public-header>
            <Suspense fallback={<NavbarSkeleton />}>
              <AsyncHeader />
            </Suspense>
          </div>
          <UserRoleProvider role={session?.user?.role || null} isLoggedIn={!!session}>
            <main className="w-full grow">
              <PageTransition>{children}</PageTransition>
            </main>
          </UserRoleProvider>
          <div data-public-footer>
            <Suspense fallback={null}>
              <AsyncFooter />
            </Suspense>
          </div>
        </AppShell>
      </body>
    </html>
  );
}
