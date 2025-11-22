/** @type {import('next').NextConfig} */
const nextConfig = {
  // Отключаем Turbopack для стабильности
  experimental: {
    turbo: {
      root: process.cwd(),
    }
  }
};

export default nextConfig;
