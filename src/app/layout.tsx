import type { Metadata } from 'next'
import { Google_Sans_Flex } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from "@/components/ui/sonner"

const sansFlex = Google_Sans_Flex({ 
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: true 
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sansFlex.className} min-h-screen`}>
        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}