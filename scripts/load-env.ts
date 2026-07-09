// Side-effect module: load .env.local (then .env) BEFORE any env-consuming
// module is imported. ES imports are hoisted, so importing this FIRST guarantees
// process.env is populated before src/lib/env.ts parses it. Next.js loads
// .env.local on its own; this is only for standalone tsx / drizzle-kit scripts.
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });
