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
import Header from './_components/sections/Header';
import Footer from './_components/sections/Footer';
import TopProgressBar from './_components/ui/TopProgressBar';
import ToasterProvider from './_components/ui/ToasterProvider';
import { UserRoleProvider } from './_components/ui/UserRoleProvider';
import PageTransition from './_components/motion/PageTransition';
import { auth } from '@/app/_lib/auth';
import {
  getSocialLinks,
  getContactInfo,
  getFooterData,
  getAllPublicSettings,
} from '@/app/_lib/public-actions';
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
    'theme-color': '#0f172a',
  },
};

export default async function RootLayout({ children }) {
  const [session, social, contact, footer, settings] = await Promise.all([
    auth(),
    getSocialLinks(),
    getContactInfo(),
    getFooterData(),
    getAllPublicSettings(),
  ]);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${sora.variable} ${lora.variable}`}
    >
      <body
        className={`${inter.className} bg-background-dark text-primary-50 flex min-h-screen flex-col`}
      >
        <TopProgressBar />
        <ToasterProvider />
        <UserRoleProvider
          role={session?.user?.role || null}
          isLoggedIn={!!session}
        >
          <Header />
          <main className="grow overflow-x-clip">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer
            session={session}
            social={social}
            contact={contact}
            footer={footer}
            settings={settings}
          />
        </UserRoleProvider>
      </body>
    </html>
  );
}
