export function parseListArg(argv: string[], names: string[]): string[] | null {
  let lastMatch: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!names.includes(token)) continue;
    const value = argv[i + 1];
    if (!value) continue;
    lastMatch = value;
    i += 1;
  }
  if (!lastMatch) return null;
  return lastMatch
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function warnDeprecated(
  argv: string[],
  logPrefix: string,
  oldName: string,
  newName: string,
): void {
  if (argv.includes(`--${oldName}`)) {
    console.warn(`${logPrefix} --${oldName} is deprecated; use --${newName}`);
  }
}

export function filterAllowed(
  logPrefix: string,
  label: string,
  current: string[],
  requested: string[],
): string[] {
  const set = new Set(current);
  const out: string[] = [];
  const bad: string[] = [];
  for (const value of requested) {
    if (set.has(value)) out.push(value);
    else bad.push(value);
  }
  if (bad.length) {
    console.warn(
      `${logPrefix} Ignoring unsupported ${label} values: ${bad.join(", ")}`,
    );
  }
  return out.length ? out : current;
}

export interface EslintProfile {
  eslint: string;
  eslintJs: string;
  tsParser: string;
}

export function filterEslintProfiles(
  logPrefix: string,
  requested: string[],
  available: EslintProfile[],
): EslintProfile[] {
  const map = new Map<string, EslintProfile>(
    available.map((profile) => [profile.eslint, profile]),
  );
  const out = requested
    .map((ver) => map.get(ver))
    .filter((profile): profile is EslintProfile => Boolean(profile));
  if (out.length !== requested.length) {
    const bad = requested.filter((ver) => !map.has(ver));
    console.warn(
      `${logPrefix} Ignoring unsupported eslint values: ${bad.join(", ")}`,
    );
  }
  return out.length ? out : available;
}
