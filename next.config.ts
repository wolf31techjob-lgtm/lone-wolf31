import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "https://preview-chat-fed595e1-7474-496d-a5ea-3b082be5d8ca.space-z.ai",
    "https://store-update-monitoring.space-z.ai",
    "*.space-z.ai",
  ],
};

export default nextConfig;
