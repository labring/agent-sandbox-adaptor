import { rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
rmSync('dist', { recursive: true, force: true });

// ESM build — keep peer deps external
console.log('📦 Building ESM...');
const esmResult = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  splitting: false,
  sourcemap: 'none',
  minify: false
  // external: ESM_EXTERNAL_DEPS
});

if (!esmResult.success) {
  console.error('❌ ESM build failed');
  esmResult.logs.forEach((log) => console.error(log));
  process.exit(1);
}

// CJS build — bundle all deps (including ESM-only ones like chalk) for CommonJS compatibility.
// This avoids "ERR_PACKAGE_PATH_NOT_EXPORTED" when bundlers like webpack/rspack call require().
console.log('📦 Building CJS...');
const cjsResult = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  format: 'cjs',
  naming: '[name].cjs',
  splitting: false,
  sourcemap: 'none',
  minify: false
  // No externals: bundle everything so require() works out of the box
});

if (!cjsResult.success) {
  console.error('❌ CJS build failed');
  cjsResult.logs.forEach((log) => console.error(log));
  process.exit(1);
}

console.log('✅ JavaScript build complete');

// Generate type definitions
console.log('📝 Generating type definitions...');
execSync('tsc -p tsconfig.build.json', { stdio: 'inherit' });

console.log('✅ Build complete!');
