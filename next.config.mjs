import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  //outputFileTracingRoot: '/Users/ddbrother/Github/nobelium',
  serverExternalPackages: ['jsdom'],

  experimental: {
    // Set client-side router cache stale time to 0 so dynamic pages
    // (articles, admin) never serve stale cached segments after an edit.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
};

export default nextConfig;
