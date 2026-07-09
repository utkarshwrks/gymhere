import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads .env.local automatically; standalone scripts must load it explicitly.
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
