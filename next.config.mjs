import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sourceCommit() {
  const fromCoolify = process.env.SOURCE_COMMIT;
  if (fromCoolify && fromCoolify !== 'unknown') return fromCoolify;
  try {
    return execSync('git rev-parse HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  //outputFileTracingRoot: '/Users/ddbrother/Github/nobelium',
  serverExternalPackages: ['jsdom'],

  env: {
    BUILD_COMMIT: sourceCommit(),
    REPO_URL: process.env.REPO_URL || 'https://github.com/DDbrother9999/nobelium',
    BUILD_TIME: new Date().toISOString(),
  },

  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
};

export default nextConfig;
