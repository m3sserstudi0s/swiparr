import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const fallbackVersion = '0.0.0';

const readPackageJson = () => {
  const packagePath = join(process.cwd(), 'package.json');
  try {
    return JSON.parse(readFileSync(packagePath, 'utf8'));
  } catch {
    return undefined;
  }
};

const resolveGithubRepo = () => {
  if (process.env.GITHUB_REPO) {
    return process.env.GITHUB_REPO;
  }

  const pkg = readPackageJson();
  const repoValue = typeof pkg?.repository === 'string'
    ? pkg.repository
    : pkg?.repository?.url;

  if (!repoValue) {
    return undefined;
  }

  const match = String(repoValue).match(/github\.com[:/](.+?\/[^/]+?)(?:\.git)?$/i);
  return match?.[1];
};

const resolveVersionFromGitHub = async () => {
  const repo = resolveGithubRepo();
  if (!repo) {
    return undefined;
  }

  const releaseUrl = `https://api.github.com/repos/${repo}/releases/latest`;
  try {
    const response = await fetch(releaseUrl, {
      headers: { Accept: 'application/vnd.github+json' },
    });

    if (response.ok) {
      const data = await response.json();
      const tag = String(data?.tag_name || '').trim();
      if (tag) {
        return tag.replace(/^v/i, '');
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const resolveVersion = async () => {
  const envVersion = process.env.APP_VERSION || process.env.NEXT_PUBLIC_APP_VERSION;
  if (envVersion) {
    return envVersion.replace(/^v/i, '');
  }

  const githubVersion = await resolveVersionFromGitHub();
  if (githubVersion) {
    return githubVersion;
  }

  return fallbackVersion;
};

const version = await resolveVersion();
const content = `NEXT_PUBLIC_APP_VERSION=${version}\n`;
const targetPath = join(process.cwd(), '.env.production.local');

writeFileSync(targetPath, content, { encoding: 'ascii' });
process.stdout.write(`Wrote ${targetPath} with version ${version}\n`);
