import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Avoid bundling native modules (better-sqlite3) into the Next.js server bundle.
  serverExternalPackages: [
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
    "@prisma/client",
  ],
};

export default nextConfig;
