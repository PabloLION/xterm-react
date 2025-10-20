import { execSync, exec } from 'node:child_process'
import type { ExecException } from 'node:child_process'
import * as fs from 'node:fs'

type ExecSyncError = Error & {
  stdout?: Buffer | string
  stderr?: Buffer | string
}

export interface CommandOptions {
  cwd?: string
  logFile?: string
}

export interface AsyncCommandOptions extends CommandOptions {
  onFailure?: (details: { error: ExecException | null; out: string; logFile?: string }) => void
}

export interface CommandResult {
  ok: boolean
  out: string
  error?: ExecException | ExecSyncError | null
}

export const MAX_EXEC_BUFFER = 10 * 1024 * 1024

export function runCommand(cmd: string, options: CommandOptions = {}): CommandResult {
  const { cwd, logFile } = options
  try {
    const out = execSync(cmd, { cwd, stdio: 'pipe' }).toString()
    if (logFile) fs.writeFileSync(logFile, out)
    return { ok: true, out }
  } catch (error) {
    const execError = error as ExecSyncError
    const stdout = toStringIfPresent(execError.stdout)
    const stderr = toStringIfPresent(execError.stderr)
    const out = `${stdout}${stderr ? `\n${stderr}` : ''}`
    if (logFile) fs.writeFileSync(logFile, out)
    return { ok: false, out, error: execError }
  }
}

function toStringIfPresent(value: Buffer | string | undefined): string {
  if (value === undefined) {
    return ''
  }
  return typeof value === 'string' ? value : value.toString()
}

export function runCommandAsync(cmd: string, options: AsyncCommandOptions = {}): Promise<CommandResult> {
  const { cwd, logFile, onFailure } = options
  return new Promise(resolve => {
    exec(cmd, { cwd, maxBuffer: MAX_EXEC_BUFFER }, (error, stdout, stderr) => {
      const stdoutStr = toStringIfPresent(stdout)
      const stderrStr = toStringIfPresent(stderr)
      const out = `${stdoutStr}${stderrStr ? `\n${stderrStr}` : ''}`
      if (logFile) fs.writeFileSync(logFile, out)
      const ok = !error
      if (!ok && typeof onFailure === 'function') {
        onFailure({ error, out, logFile })
      }
      resolve({ ok, out, error })
    })
  })
}

export function runCommandStreaming(cmd: string, options: CommandOptions = {}): void {
  const { cwd } = options
  execSync(cmd, { cwd, stdio: 'inherit' })
}
