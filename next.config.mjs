/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence the "multiple lockfiles" workspace root warning
  //outputFileTracingRoot: '/Users/ddbrother/Github/nobelium',

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
