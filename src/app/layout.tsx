import './globals.css'
import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Zalando_Sans } from 'next/font/google'
import { Providers } from '@/components/providers'
import { getAsyncRuntimeConfig } from '@/lib/runtime-config'
import { TouchProvider } from '@/components/ui/hybrid-tooltip'
import { Analytics } from "@vercel/analytics/next"
import { config as appConfig } from "@/lib/config";

export const dynamic = 'force-dynamic';

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

export async function generateMetadata(): Promise<Metadata> {
  const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
  const url = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
  const tagline = "Swipe on what to watch next, by yourself or together.";
  
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
      title: "Swiparr – Discover what to watch next",
      description: tagline,
      url: url,
      siteName: "Swiparr",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Swiparr – Discover what to watch next",
      description: tagline,
    },
  };
}


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const config = await getAsyncRuntimeConfig();
  const useAnalytics = appConfig.USE_ANALYTICS

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__SWIPARR_CONFIG__ = ${JSON.stringify(config)};
            `,
          }}
        />
      </head>
      <body className={`${sansFlex.variable} ${jetbrainsMono.variable}`}>
        {useAnalytics && <Analytics/>}

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

      </body>
    </html>
  )
}