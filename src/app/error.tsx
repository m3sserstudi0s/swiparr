'use client';

import { useEffect } from 'react';
import ErrorDisplay from '@/components/error-display';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; errorId?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    logger.error("Client-side Application Error", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <ErrorDisplay error={error} reset={reset} type="500" />
    </div>
  );
}
