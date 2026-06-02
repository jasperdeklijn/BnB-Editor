/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/editor/bnb",
        destination: "/editor/business",
        permanent: true,
      },
      {
        source: "/editor/rooms",
        destination: "/editor/services",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
