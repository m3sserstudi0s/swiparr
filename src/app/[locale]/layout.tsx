import '../globals.css'
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { connection } from 'next/server';
import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Zalando_Sans } from 'next/font/google'
import { Providers } from '@/components/providers'
import { getAsyncRuntimeConfig } from '@/lib/server/runtime-config'
import { TouchProvider } from '@/components/ui/hybrid-tooltip'
import { Analytics } from "@vercel/analytics/next"
import { config as appConfig } from "@/lib/config";
import { Suspense } from 'react';
import { RuntimeConfigScript } from '@/components/RuntimeConfigScript';

const sansFlex = Zalando_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  adjustFontFallback: true,
  fallback: ["Arial", "Times New Roman"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#141414' },
  ],
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('Metadata');
  const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
  const url = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
  const tagline = t('tagline');

  return {
    metadataBase: new URL(url),
    title: {
      default: "Swiparr",
      template: "%s | Swiparr"
    },
    description: tagline,
    appleWebApp: { capable: true, title: "Swiparr", statusBarStyle: "black-translucent" },
    icons: {
      icon: `${basePath}/favicon.ico`,     
      shortcut: `${basePath}/icon1.png`,   
      apple: `${basePath}/apple-icon.png`,
    },
    openGraph: {
      title: t('title'),
      description: tagline,
      url: url,
      siteName: "Swiparr",
      locale: locale === 'de' ? "de_DE" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t('title'),
      description: tagline,
    },
  };
}


export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  const useAnalytics = appConfig.USE_ANALYTICS

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <Suspense>
          <RuntimeConfigScript />
        </Suspense>
      </head>
      <body className={`${sansFlex.variable} ${jetbrainsMono.variable} overflow-y-hidden`}>
        {useAnalytics && <Analytics/>}

        <NextIntlClientProvider messages={messages}>
          <Providers
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TouchProvider>
              {children}
            </TouchProvider>
          </Providers>
        </NextIntlClientProvider>

      </body>
    </html>
  )
}
