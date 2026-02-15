/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only enable source maps in development for debugging
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',

  // Webpack configuration for debugging (when using --webpack flag)
  webpack: (config, { dev, isServer }) => {
    if (dev && isServer) {
      // Disable minification for server-side code in development
      // This ensures source maps work correctly with the debugger
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }
    return config;
  },

  // Turbopack config (Next.js 16+ default)
  // Empty config to silence webpack warning when using Turbopack
  turbopack: {}
};

export default nextConfig;