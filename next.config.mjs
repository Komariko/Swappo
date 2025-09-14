/** @type {import('next').NextConfig} */
const nextConfig = {
  // ลบ output: 'export'
  trailingSlash: true, // จะคงไว้/เอาออกก็ได้
  images: {
    domains: ['firebasestorage.googleapis.com'],
    unoptimized: true,
  },
};

export default nextConfig;
