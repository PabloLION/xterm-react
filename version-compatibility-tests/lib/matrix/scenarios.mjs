function slug(parts) {
  return parts
    .map(part => part.replace(/[^a-z0-9.\-]+/gi, '-'))
    .join('+')
    .toLowerCase()
}

export function scenarioSlug(details) {
  const base = [`runtime-${details.runtime.label}`, `react-${details.react}`, `ts-${details.typescript}`]
  if (details.linter.tool === 'biome') {
    base.push(`biome-${details.linter.version}`)
  } else {
    base.push(`eslint-${details.linter.eslint}`, `prettier-${details.linter.prettier}`)
  }
  return slug(base)
}

export function buildScenarios({
  runtimes,
  reacts,
  typescriptVersions,
  linterFamilies,
  biomeVersions,
  eslintProfiles,
  prettierVersions
}) {
  const scenarios = []
  const families = Array.from(linterFamilies)
  for (const runtime of runtimes) {
    for (const react of reacts) {
      for (const typescript of typescriptVersions) {
        for (const family of families) {
          if (family === 'biome') {
            for (const version of biomeVersions) {
              scenarios.push({
                runtime,
                react,
                typescript,
                linter: { tool: 'biome', version }
              })
            }
          } else if (family === 'eslint-prettier') {
            for (const eslintProfile of eslintProfiles) {
              for (const prettier of prettierVersions) {
                scenarios.push({
                  runtime,
                  react,
                  typescript,
                  linter: {
                    tool: 'eslint-prettier',
                    eslint: eslintProfile.eslint,
                    eslintJs: eslintProfile.eslintJs,
                    tsParser: eslintProfile.tsParser,
                    prettier
                  }
                })
              }
            }
          }
        }
      }
    }
  }
  return scenarios
}
