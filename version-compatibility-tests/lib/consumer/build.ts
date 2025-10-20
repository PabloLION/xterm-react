import { runCommandStreaming } from '../cli/run-command.js'

interface RunConsumerBuildOptions {
  appDir: string
  logPrefix: string
  hasBiome: boolean
}

export function runConsumerBuild({ appDir, logPrefix, hasBiome }: RunConsumerBuildOptions): void {
  runCommandStreaming('pnpm install', { cwd: appDir })
  runCommandStreaming('pnpm exec vite build', { cwd: appDir })
  if (hasBiome) {
    try {
      runCommandStreaming('pnpm exec biome check --config-path biome.json .', { cwd: appDir })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`${logPrefix} Biome check failed (non-blocking): ${message}`)
    }
  }
}
