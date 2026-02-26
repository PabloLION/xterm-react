import * as fs from "node:fs";
import * as path from "node:path";
import { runCommandStreaming } from "../cli/run-command.js";

interface EnsureTarballOptions {
  providedTarball?: string | null;
  repoRoot: string;
  distDir: string;
  logPrefix: string;
}

export function ensureTarball({
  providedTarball,
  repoRoot,
  distDir,
  logPrefix,
}: EnsureTarballOptions): string {
  fs.mkdirSync(distDir, { recursive: true });

  if (providedTarball) {
    const abs = path.isAbsolute(providedTarball)
      ? providedTarball
      : path.join(repoRoot, providedTarball);
    if (!fs.existsSync(abs)) {
      throw new Error(`${logPrefix} Provided tarball not found: ${abs}`);
    }
    if (!abs.endsWith(".tgz")) {
      throw new Error(
        `${logPrefix} Provided tarball must be a .tgz file: ${abs}`,
      );
    }
    const resolved = fs.realpathSync(abs);
    const relToRepo = path.relative(repoRoot, resolved);
    if (relToRepo.startsWith("..") || path.isAbsolute(relToRepo)) {
      throw new Error(
        `${logPrefix} Provided tarball must be within the repository tree: ${abs}`,
      );
    }
    const tgzName = path.basename(resolved);
    if (path.dirname(resolved) !== distDir) {
      fs.copyFileSync(resolved, path.join(distDir, tgzName));
    }
    return tgzName;
  }

  runCommandStreaming(
    "pnpm pack --pack-destination version-compatibility-tests/dist",
    { cwd: repoRoot },
  );
  const latest = fs
    .readdirSync(distDir)
    .filter((file): file is string => file.endsWith(".tgz"))
    .map((file) => ({
      file,
      time: fs.statSync(path.join(distDir, file)).ctimeMs,
    }))
    .sort((a, b) => {
      const diff = b.time - a.time;
      return diff !== 0 ? diff : a.file.localeCompare(b.file);
    })[0];
  if (!latest) {
    throw new Error(
      `${logPrefix} No packed tarball found under version-compatibility-tests/dist`,
    );
  }
  return latest.file;
}
