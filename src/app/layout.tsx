import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { getAsyncRuntimeConfig } from '@/lib/runtime-config'
import { TouchProvider } from '@/components/ui/hybrid-tooltip'

export const dynamic = 'force-dynamic';


const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
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
  const { basePath } = await getAsyncRuntimeConfig();
  const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    metadataBase: new URL(url),
    title: "Swiparr",
    description: "Swipe on movies.",
    appleWebApp: { capable: true, title: "Swiparr", statusBarStyle: "black-translucent" },
    icons: {
      icon: `${basePath}/favicon.ico`,     
      shortcut: `${basePath}/icon1.png`,   
      apple: `${basePath}/apple-icon.png`,
    },
    openGraph: {
      title: "Swiparr",
      description: "Swipe on movies.",
      url: url,
      siteName: "Swiparr",
      images: [
        {
          url: `${basePath}/icon1.png`,
          width: 512,
          height: 512,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "Swiparr",
      description: "Swipe on movies.",
      images: [`${basePath}/icon1.png`],
    },
  };
}


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const config = await getAsyncRuntimeConfig();

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
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>

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