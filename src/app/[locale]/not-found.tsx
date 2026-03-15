'use client';

import ErrorDisplay from '@/components/error-display';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <ErrorDisplay type="404" />
    </div>
  );
}
