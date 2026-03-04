'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, WifiOff, Home, RotateCcw, Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRuntimeConfig } from '@/lib/runtime-config';
import { GITHUB_URL } from '@/lib/constants';

interface ErrorDisplayProps {
  error?: Error & { digest?: string; errorId?: string };
  reset?: () => void;
  type?: '404' | '500' | 'offline' | 'generic';
}

export default function ErrorDisplay({ error, reset, type = 'generic' }: ErrorDisplayProps) {
  const [isOffline, setIsOffline] = useState(false);
  const { basePath } = useRuntimeConfig();
  const t = useTranslations('ErrorDisplay');

  useEffect(() => {
    // Check initial state
    setIsOffline(!window.navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Use offline state if detected, otherwise use provided type
  const displayType = isOffline ? 'offline' : type;

  const errorConfigs = {
    '404': {
      icon: Search,
      title: t('pageNotFoundTitle'),
      description: t('pageNotFoundDesc'),
      buttonText: t('back'),
      action: () => (window.location.href = `${basePath}/`),
    },
    '500': {
      icon: AlertCircle,
      title: t('systemErrorTitle'),
      description: t('systemErrorDesc'),
      buttonText: t('tryAgain'),
      action: reset || (() => window.location.reload()),
    },
    'offline': {
      icon: WifiOff,
      title: t('noConnectionTitle'),
      description: t('noConnectionDesc'),
      buttonText: t('retry'),
      action: () => window.location.reload(),
    },
    'generic': {
      icon: AlertCircle,
      title: t('appErrorTitle'),
      description: error?.message || t('appErrorDescFallback'),
      buttonText: t('restart'),
      action: reset || (() => window.location.reload()),
    },
  };

  const config = errorConfigs[displayType];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="bg-destructive/10 p-4 rounded-full mb-6">
        <Icon className="size-12 text-destructive" />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
        {config.title}
      </h1>
      
      <p className="text-muted-foreground max-w-md mb-8 text-sm">
        {config.description}
      </p>

      {(error?.digest || error?.errorId) && (
        <div className="mb-8 flex flex-col gap-4 items-center">
          {error?.errorId && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-semibold opacity-50">{t('errorId')}</p>
              <code className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm font-mono border border-primary/20 font-bold">
                {error.errorId}
              </code>
            </div>
          )}
          {error?.digest && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-semibold opacity-50">{t('errorRef')}</p>
              <code className="bg-muted px-3 py-1.5 rounded-md text-xs font-mono border border-border">
                {error.digest}
              </code>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={config.action} size="lg" className="min-w-44 font-semibold">
          <RotateCcw className="size-4" />
          {config.buttonText}
        </Button>
        
        <Button asChild variant="outline" size="lg" className="min-w-44 font-semibold">
          <Link href={`${basePath}/`}>
            <Home className="size-4" />
            {t('goHome')}
          </Link>
        </Button>
      </div>
      
      {type === 'generic' && !isOffline && (
        <p className="mt-12 text-sm text-muted-foreground/60 max-w-sm italic">
          {t('persistPrefix')} <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{t('here')}</a>
        </p>
      )}
    </div>
  );
}
