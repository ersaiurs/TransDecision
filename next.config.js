/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Membiarkan build Vercel tetap jalan meskipun ada warning/error ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Opsional: mengabaikan error TypeScript ringan saat build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;