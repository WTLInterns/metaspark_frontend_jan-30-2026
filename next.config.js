/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      // Redirect all AdminUser routes to the appropriate pages
      {
        source: '/AdminUser/:path*',
        destination: '/AdminUser/:path*',
      },
    ];
  },
  async redirects() {
    return [
      // Redirect root to dashboard for admin users
      {
        source: '/AdminUser',
        destination: '/AdminUser/dashboard',
        permanent: true,
      },
    ];
  },
  // Enable React Strict Mode for better debugging
  reactStrictMode: true,
  // Enable static exports for better performance
  output: 'standalone',
  // Enable TypeScript type checking
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLint configuration is no longer supported in next.config.js for Next.js 16+
  // Move ESLint configuration to .eslintrc.json if needed
};

module.exports = nextConfig;
