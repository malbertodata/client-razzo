/**
 * Loads repo-root `.env` into `process.env` for local dev/preview.
 * Production (Coolify) injects env vars into the container — no `.env` file there.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}
