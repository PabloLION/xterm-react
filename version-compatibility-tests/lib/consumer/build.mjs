import { runCommandStreaming } from '../cli/run-command.mjs'

export function runConsumerBuild({ appDir, logPrefix, hasBiome }) {
  runCommandStreaming('pnpm install', { cwd: appDir })
  runCommandStreaming('pnpm exec vite build', { cwd: appDir })
  if (hasBiome) {
    try {
      runCommandStreaming('pnpm exec biome check --config-path biome.json .', { cwd: appDir })
    } catch (error) {
      console.warn(`${logPrefix} Biome check failed (non-blocking): ${error?.message || String(error)}`)
    }
  }
}
