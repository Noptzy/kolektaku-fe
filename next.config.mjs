/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "media.kitsu.io" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.gogocdn.net" },
      { protocol: "https", hostname: "recap-guide.com" },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      "localhost:5173",
      "192.168.100.26:5173",
      "192.168.100.26",
    ],
  },
};

export default nextConfig;
