import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const fallbackVersion = '0.0.0';

const resolveVersion = () => {
  const envVersion = process.env.APP_VERSION || process.env.NEXT_PUBLIC_APP_VERSION;
  if (envVersion) {
    return envVersion.replace(/^v/i, '');
  }

  try {
    execSync('git fetch --tags --force', {
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const tag = execSync('git describe --tags --abbrev=0', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    if (tag) {
      return tag.replace(/^v/i, '');
    }
  } catch {
    // ignore and fall back
  }

  return fallbackVersion;
};

const version = resolveVersion();
const content = `NEXT_PUBLIC_APP_VERSION=${version}\n`;
const targetPath = join(process.cwd(), '.env.production.local');

writeFileSync(targetPath, content, { encoding: 'ascii' });
process.stdout.write(`Wrote ${targetPath} with version ${version}\n`);
