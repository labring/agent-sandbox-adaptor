import { rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

// External dependencies (peer dependencies)
const EXTERNAL_DEPS = ['@alibaba-group/opensandbox'];

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
rmSync('dist', { recursive: true, force: true });

// Build with bun
console.log('📦 Building with bun...');
const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  splitting: false,
  sourcemap: 'none',
  minify: false,
  external: EXTERNAL_DEPS
});

if (!result.success) {
  console.error('❌ Build failed');
  result.logs.forEach((log) => console.error(log));
  process.exit(1);
}

console.log('✅ JavaScript build complete');

// Generate type definitions
console.log('📝 Generating type definitions...');
execSync('tsc -p tsconfig.build.json', { stdio: 'inherit' });

console.log('✅ Build complete!');
