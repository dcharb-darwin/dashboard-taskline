import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || "file:./data/taskline.db";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbUrl,
  },
});
