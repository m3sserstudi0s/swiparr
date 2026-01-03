import type { Metadata } from 'next'
import { Google_Sans_Flex } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from "@/components/ui/sonner"
import { getRuntimeConfig } from '@/lib/runtime-config'

export const dynamic = 'force-dynamic';

const sansFlex = Google_Sans_Flex({ 
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false 
})

export const metadata: Metadata = {
  title: "Swiparr",
  description: "Swipe on your Jellyfin media",
  appleWebApp: { capable: true, title: "Swiparr", statusBarStyle: "black-translucent" },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/icon1.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const config = getRuntimeConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__SWIPARR_CONFIG__ = ${JSON.stringify(config)};
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${sansFlex.className} min-h-screen`}>

        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster expand visibleToasts={1} position='top-right'/>
        </Providers>
      </body>
    </html>
  )
}