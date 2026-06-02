import path from "path"
import { fileURLToPath } from "url"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin root so Next.js does not walk up to VB V0/pnpm-lock.yaml (breaks module resolution in dev)
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['luckyfuzsion.com', 'gxciioabwrkahdfe.public.blob.vercel-storage.com'],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/HM.png',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude Node.js built-in modules from client-side bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        stream: false,
        crypto: false,
      }
    }
    return config
  },
}

export default nextConfig
