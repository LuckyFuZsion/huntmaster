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
    domains: ['luckyfuzsion.com', 'gxciioabwrkahdfe.public.blob.vercel-storage.com'],
    unoptimized: true,
  },
}

export default nextConfig
