'use client';

import { useEffect } from 'react';
import ErrorDisplay from '@/components/error-display';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <ErrorDisplay error={error} reset={reset} type="500" />
    </div>
  );
}
