import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';
import fs from 'fs';

const getDefaultDbPath = () => {
  if (process.env.NODE_ENV === 'production' || fs.existsSync('/app/data')) {
    return '/app/data/swiparr.db';
  }
  return 'swiparr.db';
};

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace("file:", "") || getDefaultDbPath(),
  },
});
