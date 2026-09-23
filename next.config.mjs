import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  //outputFileTracingRoot: '/Users/ddbrother/Github/nobelium',
  serverExternalPackages: ['jsdom'],

  env: {
    BUILD_COMMIT: git('rev-parse --short HEAD'),
    BUILD_COMMIT_TIME: git('log -1 --format=%cI'),
  },

  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
};

export default nextConfig;
