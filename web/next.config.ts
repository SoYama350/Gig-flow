import type { NextConfig } from "next";

// GITHUB_PAGES=1 builds a fully static export (no server runtime / API routes)
// suitable for GitHub Pages. basePath/assetPrefix must match the repo name.
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Avoid bundling native modules (better-sqlite3) into the Next.js server bundle.
  serverExternalPackages: [
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
    "@prisma/client",
  ],
  ...(isGithubPages
    ? {
        output: "export" as const,
        basePath: "/Gig-flow",
        assetPrefix: "/Gig-flow/",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
