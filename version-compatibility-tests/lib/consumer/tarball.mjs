import fs from 'node:fs'
import path from 'node:path'
import { runCommandStreaming } from '../cli/run-command.mjs'

export function ensureTarball({ providedTarball, repoRoot, distDir, logPrefix }) {
  fs.mkdirSync(distDir, { recursive: true })

  if (providedTarball) {
    const abs = path.isAbsolute(providedTarball) ? providedTarball : path.join(repoRoot, providedTarball)
    if (!fs.existsSync(abs)) {
      throw new Error(`${logPrefix} Provided tarball not found: ${abs}`)
    }
    if (!abs.endsWith('.tgz')) {
      throw new Error(`${logPrefix} Provided tarball must be a .tgz file: ${abs}`)
    }
    const resolved = fs.realpathSync(abs)
    const relToRepo = path.relative(repoRoot, resolved)
    if (relToRepo.startsWith('..') || path.isAbsolute(relToRepo)) {
      throw new Error(`${logPrefix} Provided tarball must be within the repository tree: ${abs}`)
    }
    const tgzName = path.basename(resolved)
    if (path.dirname(resolved) !== distDir) {
      fs.copyFileSync(resolved, path.join(distDir, tgzName))
    }
    return tgzName
  }

  runCommandStreaming('pnpm pack --pack-destination version-compatibility-tests/dist', { cwd: repoRoot })
  const latest = fs
    .readdirSync(distDir)
    .filter(f => f.endsWith('.tgz'))
    .map(f => ({ f, t: fs.statSync(path.join(distDir, f)).ctimeMs }))
    .sort((a, b) => {
      const diff = b.t - a.t
      return diff !== 0 ? diff : b.f.localeCompare(a.f)
    })[0]

  if (!latest) {
    throw new Error(`${logPrefix} No packed tarball found under version-compatibility-tests/dist`)
  }

  return latest.f
}
