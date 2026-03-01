import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

import { config } from '@/lib/config';

export const routing = defineRouting({
    locales: ['en', 'de'],
    defaultLocale: config.app.locale,
    localePrefix: 'never',
    localeDetection: false
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
