export function parseListArg(argv, names) {
  let lastMatch = null
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (!names.includes(token)) continue
    const value = argv[i + 1]
    if (!value) continue
    lastMatch = value
    i += 1
  }
  if (!lastMatch) return null
  return lastMatch
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
}

export function warnDeprecated(argv, logPrefix, oldName, newName) {
  if (argv.includes(`--${oldName}`)) {
    console.warn(`${logPrefix} --${oldName} is deprecated; use --${newName}`)
  }
}

export function filterAllowed(logPrefix, label, current, requested) {
  const set = new Set(current)
  const out = []
  const bad = []
  for (const value of requested) {
    if (set.has(value)) out.push(value)
    else bad.push(value)
  }
  if (bad.length) {
    console.warn(`${logPrefix} Ignoring unsupported ${label} values: ${bad.join(', ')}`)
  }
  return out.length ? out : current
}

export function filterEslintProfiles(logPrefix, requested, available) {
  const map = new Map(available.map(profile => [profile.eslint, profile]))
  const out = requested.map(ver => map.get(ver)).filter(Boolean)
  if (out.length !== requested.length) {
    const bad = requested.filter(ver => !map.has(ver))
    console.warn(`${logPrefix} Ignoring unsupported eslint values: ${bad.join(', ')}`)
  }
  return out.length ? out : available
}
