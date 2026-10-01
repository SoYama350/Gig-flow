import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.GIGFLOW_DATABASE_URL ?? `file:${path.resolve("dev.db")}`,
  },
});
