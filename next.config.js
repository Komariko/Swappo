/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',                // ✅ สั่งให้สร้างโฟลเดอร์ out/ ตอน build
  trailingSlash: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
    unoptimized: true,
  },
};

export default nextConfig;         // ✅ ESM export
  