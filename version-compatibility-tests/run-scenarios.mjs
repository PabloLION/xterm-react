#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const suiteDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(path.join(suiteDir, '..'));
const consumerAppDir = path.join(suiteDir, 'consumer-app');
const distDir = path.join(suiteDir, 'dist');
const fragmentsRoot = path.join(suiteDir, 'scenarios', 'fragments');
const logsRoot = path.join(suiteDir, 'logs', new Date().toISOString().replace(/[:.]/g, '-'));

function parseArgs(argv) {
  const args = { verbose: false, react: null, ts: null, eslint: null, prettier: null, biome: null, out: logsRoot };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const val = argv[i + 1];
    if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--react') { args.react = val; i++; }
    else if (a === '--ts') { args.ts = val; i++; }
    else if (a === '--eslint') { args.eslint = val; i++; }
    else if (a === '--prettier') { args.prettier = val; i++; }
    else if (a === '--biome') { args.biome = val; i++; }
    else if (a === '--out') { args.out = path.resolve(val); i++; }
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node version-compatibility-tests/run-scenarios.mjs [options]\n\n` +
    `Options:\n` +
    `  --react <17|18|19>            React/ReactDOM (+ types) version\n` +
    `  --ts <5.4>                   TypeScript version (optional)\n` +
    `  --eslint <8-ts6|9-ts7|9-ts8> ESLint + @typescript-eslint combo\n` +
    `  --prettier <2.8|3.0|3.3>     Prettier + plugin combo\n` +
    `  --biome <1.8|1.9|2.0|2.1|2.2> Biome version\n` +
    `  --out <dir>                  Log directory (default: timestamped)\n` +
    `  -v, --verbose                Stream command output\n`);
}

function readFragment(category, key) {
  const file = path.join(fragmentsRoot, category, `${key}.json`);
  if (!fs.existsSync(file)) throw new Error(`Fragment not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function mergeOverrides(parts) {
  return parts.reduce((acc, part) => Object.assign(acc, part), {});
}

function slug(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}-${String(v).replace(/[^a-z0-9.]+/gi, '-')}`)
    .join('+')
    .toLowerCase();
}

function exec(cmd, opts, verbose, logPath) {
  try {
    const out = execSync(cmd, { ...opts, stdio: verbose ? 'inherit' : 'pipe' });
    if (!verbose && logPath) fs.writeFileSync(logPath, out);
    return { ok: true };
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    if (logPath) fs.writeFileSync(logPath, stdout + (stderr ? `\n${stderr}` : ''));
    return { ok: false, error: err.message };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.react && !args.eslint && !args.prettier && !args.biome && !args.ts) {
    printHelp();
    process.exit(1);
  }

  fs.mkdirSync(args.out, { recursive: true });
  const dims = { react: args.react, ts: args.ts, eslint: args.eslint, prettier: args.prettier, biome: args.biome };
  const scenario = slug(dims);

  // Build overrides
  const fragments = [];
  if (args.react) fragments.push(readFragment('react', args.react));
  if (args.ts) fragments.push({ typescript: `^${args.ts}.0` });
  if (args.eslint) fragments.push(readFragment('eslint', args.eslint));
  if (args.prettier) fragments.push(readFragment('prettier', args.prettier));
  if (args.biome) fragments.push(readFragment('biome', args.biome));
  const overrides = mergeOverrides(fragments);

  const logDir = path.join(args.out, scenario);
  fs.mkdirSync(logDir, { recursive: true });

  // 1) Build & pack library tarball
  fs.mkdirSync(distDir, { recursive: true });
  const libBuild = exec('pnpm run build', { cwd: repoRoot }, args.verbose, path.join(logDir, 'lib-build.log'));
  if (!libBuild.ok) {
    console.error('Library build failed. See log:', path.join(logDir, 'lib-build.log'));
    process.exit(1);
  }
  const libPack = exec(`pnpm pack --pack-destination ${JSON.stringify(distDir)}`, { cwd: repoRoot }, args.verbose, path.join(logDir, 'lib-pack.log'));
  if (!libPack.ok) {
    console.error('Library pack failed. See log:', path.join(logDir, 'lib-pack.log'));
    process.exit(1);
  }
  const tgzs = fs.readdirSync(distDir).filter((f) => f.endsWith('.tgz')).map((f) => ({ f, t: fs.statSync(path.join(distDir, f)).ctimeMs })).sort((a,b)=>b.t-a.t);
  if (tgzs.length === 0) throw new Error('No packed tarball found');
  const tarball = tgzs[0].f;

  // 2) Prepare consumer app package.json with file dep and overrides
  const consumerPkgPath = path.join(consumerAppDir, 'package.json');
  const consumerPkg = JSON.parse(fs.readFileSync(consumerPkgPath, 'utf8'));
  const originalConsumerPkg = JSON.stringify(consumerPkg, null, 2);
  consumerPkg.dependencies = consumerPkg.dependencies || {};
  consumerPkg.dependencies['@pablo-lion/xterm-react'] = `file:../dist/${tarball}`;
  consumerPkg.pnpm = consumerPkg.pnpm || {};
  consumerPkg.pnpm.overrides = Object.assign({}, consumerPkg.pnpm.overrides || {}, overrides);
  // Ensure tool placeholders when their dimensions are requested so overrides install them
  consumerPkg.devDependencies = consumerPkg.devDependencies || {};
  if (args.eslint) {
    consumerPkg.devDependencies.eslint ||= '*';
    consumerPkg.devDependencies['@typescript-eslint/parser'] ||= '*';
    consumerPkg.devDependencies['@typescript-eslint/eslint-plugin'] ||= '*';
  }
  if (args.prettier) {
    consumerPkg.devDependencies.prettier ||= '*';
    consumerPkg.devDependencies['eslint-plugin-prettier'] ||= '*';
  }
  if (args.biome) {
    consumerPkg.devDependencies['@biomejs/biome'] ||= '*';
  }
  fs.writeFileSync(consumerPkgPath, JSON.stringify(consumerPkg, null, 2));

  // 3) Install & build consumer app
  try {
    const installRes = exec('pnpm install --prefer-offline', { cwd: consumerAppDir }, args.verbose, path.join(logDir, 'consumer-install.log'));
    const buildRes = exec('pnpm exec vite build', { cwd: consumerAppDir }, args.verbose, path.join(logDir, 'consumer-build.log'));

    // optional checks if dimensions provided
    const results = {};
    if (args.eslint) results.lint = exec('pnpm exec eslint .', { cwd: consumerAppDir }, args.verbose, path.join(logDir, 'consumer-eslint.log'));
    if (args.prettier) results.prettier = exec('pnpm exec prettier --check .', { cwd: consumerAppDir }, args.verbose, path.join(logDir, 'consumer-prettier.log'));
    if (args.biome) results.biome = exec('pnpm exec biome check .', { cwd: consumerAppDir }, args.verbose, path.join(logDir, 'consumer-biome.log'));

    const summary = {
      scenario,
      tarball,
      overrides,
      install: installRes.ok,
      build: buildRes.ok,
      results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.ok])),
      logDir,
    };
    fs.writeFileSync(path.join(logDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log('Scenario:', scenario);
    console.log('Tarball:', tarball);
    console.log('Logs:', logDir);
    console.log('Install:', installRes.ok ? 'OK' : 'FAIL');
    console.log('Build:', buildRes.ok ? 'OK' : 'FAIL');
    for (const [k, v] of Object.entries(summary.results)) console.log(`${k}: ${v ? 'OK' : 'FAIL'}`);
  } finally {
    // restore consumer package.json
    fs.writeFileSync(consumerPkgPath, originalConsumerPkg);
  }
}

main().catch((e) => {
  console.error('Runner error:', e);
  process.exit(1);
});
