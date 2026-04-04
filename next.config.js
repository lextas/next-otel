/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  logging: {
    browserToTerminal: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@opentelemetry/instrumentation');
    }
    return config;
  },
}

module.exports = nextConfig
