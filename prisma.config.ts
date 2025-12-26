// prisma.config.ts
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // This will use the environment variable already set in the container
    url: process.env.DATABASE_URL || "file:/app/data/swiparr.db",
  },
});