import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
   experimental: {
    serverComponentsHmrCache: false, // defaults to true
  },
};

export default nextConfig;
