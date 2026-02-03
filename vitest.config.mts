import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const envPath = new URL('.env.test.local', import.meta.url);
const srcPath = fileURLToPath(new URL('./src', import.meta.url));

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const match = trimmed.match(/^(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1];
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': srcPath
    }
  },
  test: {
    // This configuration runs the sandbox tests in isolation,
    // without the global setup (e.g., MongoDB connection) from the root config.
    dir: 'tests',
    testTimeout: 30000
  }
});
