import * as path from 'node:path'
import { runCommand } from '../cli/run-command.js'
import type { RuntimeDescriptor } from '../../types/compat.js'

interface RuntimeControllerOptions {
  rootDir: string
  logsRoot: string
  logPrefix: string
}

interface RuntimeController {
  ensureRuntime(runtime: RuntimeDescriptor): boolean
  restoreRuntime(): void
}

export function createRuntimeController({ rootDir, logsRoot, logPrefix }: RuntimeControllerOptions): RuntimeController {
  const originalNodeVersion = process.version.startsWith('v') ? process.version.slice(1) : process.version
  let restoreNodeVersion: string | null = null
  let runtimeMutated = false
  let activeRuntimeKey: string | null = null

  function ensureRuntime(runtime: RuntimeDescriptor): boolean {
    const key = `${runtime.tool}:${runtime.versionSpec}`
    if (activeRuntimeKey === key) return true
    if (runtime.tool === 'node') {
      const logFile = path.join(logsRoot, `runtime-${runtime.label}.log`)
      console.log(`${logPrefix} Activating runtime ${runtime.label}`)
      if (!restoreNodeVersion) restoreNodeVersion = originalNodeVersion
      const res = runCommand(`pnpm env use --global ${runtime.versionSpec}`, { cwd: rootDir, logFile })
      if (!res.ok) {
        const error = new Error(`Failed to activate Node runtime ${runtime.label}`) as Error & { output: string }
        error.output = res.out
        throw error
      }
      activeRuntimeKey = key
      runtimeMutated = true
      return true
    }

    console.warn(`${logPrefix} Runtime ${runtime.label} (${runtime.tool}) is not implemented yet; skipping scenarios`)
    activeRuntimeKey = key
    return false
  }

  function restoreRuntime(): void {
    if (!runtimeMutated || !restoreNodeVersion) return
    const logFile = path.join(logsRoot, 'runtime-restore.log')
    const res = runCommand(`pnpm env use --global ${restoreNodeVersion}`, { cwd: rootDir, logFile })
    if (!res.ok) {
      console.warn(`${logPrefix} Failed to restore Node runtime ${restoreNodeVersion}: ${res.out}`)
    } else {
      activeRuntimeKey = `node:${restoreNodeVersion}`
    }
    runtimeMutated = false
  }

  return { ensureRuntime, restoreRuntime }
}
