import { execSync, exec } from 'node:child_process'
import fs from 'node:fs'

export const MAX_EXEC_BUFFER = 10 * 1024 * 1024

export function runCommand(cmd, { cwd, logFile } = {}) {
  try {
    const out = execSync(cmd, { cwd, stdio: 'pipe' }).toString()
    if (logFile) fs.writeFileSync(logFile, out)
    return { ok: true, out }
  } catch (error) {
    const out = `${error.stdout?.toString() || ''}${error.stderr ? '\n' + error.stderr.toString() : ''}`
    if (logFile) fs.writeFileSync(logFile, out)
    return { ok: false, out, error }
  }
}

export function runCommandAsync(cmd, { cwd, logFile, onFailure } = {}) {
  return new Promise(resolve => {
    exec(cmd, { cwd, maxBuffer: MAX_EXEC_BUFFER }, (error, stdout, stderr) => {
      const out = `${stdout || ''}${stderr ? '\n' + stderr : ''}`
      if (logFile) fs.writeFileSync(logFile, out)
      const ok = !error
      if (!ok && typeof onFailure === 'function') {
        onFailure({ error, out, logFile })
      }
      resolve({ ok, out, error })
    })
  })
}
