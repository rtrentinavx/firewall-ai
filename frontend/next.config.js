/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8080/api/v1/:path*', // Proxy to Flask backend
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Suppress webpack cache serialization warnings
    if (!isServer) {
      config.infrastructureLogging = {
        level: 'error', // Only show errors, suppress warnings
      }

      // Configure cache to be more lenient with serialization
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }
    }

    return config
  },
}

module.exports = nextConfig