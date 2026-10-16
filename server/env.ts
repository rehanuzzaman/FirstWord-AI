import { existsSync } from "node:fs";

// Loads .env (git-ignored) before any provider module reads process.env.
// Must be the first import in server/index.ts.
if (existsSync(".env")) process.loadEnvFile(".env");
