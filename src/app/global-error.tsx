'use client';

import ErrorDisplay from '@/components/error-display';
import { Google_Sans_Flex, JetBrains_Mono } from 'next/font/google';
import '@/app/globals.css';

const sansFlex = Google_Sans_Flex({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={`${sansFlex.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
          <ErrorDisplay error={error} reset={reset} type="generic" />
        </div>
      </body>
    </html>
  );
}
