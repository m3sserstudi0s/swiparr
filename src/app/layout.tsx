import type { Metadata, Viewport } from 'next'
import { Google_Sans_Flex, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { getRuntimeConfig } from '@/lib/runtime-config'
import { getUseStaticFilterValues } from '@/lib/server/admin'

export const dynamic = 'force-dynamic';

const sansFlex = Google_Sans_Flex({ 
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-sans',
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
  const { basePath } = getRuntimeConfig();
  return {
    title: "Swiparr",
    description: "Swipe on your Jellyfin media",
    appleWebApp: { capable: true, title: "Swiparr", statusBarStyle: "black-translucent" },
    icons: {
      icon: `${basePath}/favicon.ico`,     
      shortcut: `${basePath}/icon1.png`,   
      apple: `${basePath}/apple-icon.png`,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const useStaticFilterValues = await getUseStaticFilterValues();
  const config = getRuntimeConfig({ useStaticFilterValues });
  const basePath = config.basePath || "";

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

        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}