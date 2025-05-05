/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["cdn.babylonjs.com", "assets.babylonjs.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placeholder.svg",
      },
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.babylonjs.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://assets.babylonjs.com; font-src 'self'; connect-src 'self' https://assets.babylonjs.com; frame-src 'self';",
          },
        ],
      },
    ]
  },
  // Ensure external scripts can be loaded
  experimental: {
    scriptLoader: true,
  },
}

module.exports = nextConfig
