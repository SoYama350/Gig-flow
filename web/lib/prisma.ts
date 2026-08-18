import path from "node:path";
import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Ensure the SQLite file path is resolved relative to the project root in both
// local dev and serverless runtimes.
const dbPath = path.resolve(process.cwd(), "dev.db");

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
