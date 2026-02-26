import { connection } from 'next/server';
import { getAsyncRuntimeConfig } from '@/lib/server/runtime-config';

export async function RuntimeConfigScript() {
  await connection();
  const config = await getAsyncRuntimeConfig();
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.__SWIPARR_CONFIG__ = ${JSON.stringify(config)};
        `,
      }}
    />
  );
}
