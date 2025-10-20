import { execSync } from 'node:child_process'
import { assertAllowedPackage } from './pin-config.mjs'

function view(command) {
  return execSync(command, { stdio: 'pipe' }).toString().trim()
}

export function getLatest(name) {
  assertAllowedPackage(name)
  return view(`pnpm view ${name} version`)
}

export function pickLatestForMajor(versions, major) {
  const filtered = versions.filter(v => String(v).startsWith(`${major}.`))
  return filtered[filtered.length - 1] || null
}

export function getLatestForMajor(name, major) {
  assertAllowedPackage(name)
  try {
    const raw = view(`pnpm view ${name} versions --json`)
    const versions = JSON.parse(raw)
    return pickLatestForMajor(versions, major) || getLatest(name)
  } catch {
    return getLatest(name)
  }
}

export function resolveConsumerVersions(args) {
  const react = args.react || getLatest('react')
  const reactDom = args.reactDom || getLatest('react-dom')
  const reactMajor = String(react).split('.')[0]

  const versions = {
    react,
    'react-dom': reactDom,
    typescript: args.typescript || getLatest('typescript'),
    '@types/react': args.typesReact || getLatestForMajor('@types/react', reactMajor),
    '@types/react-dom': args.typesReactDom || getLatestForMajor('@types/react-dom', reactMajor),
    vite: args.vite || getLatest('vite'),
    '@vitejs/plugin-react': args.pluginReact || getLatest('@vitejs/plugin-react')
  }

  const lintDevDeps = {}

  if (args.biome) {
    assertAllowedPackage('@biomejs/biome')
    lintDevDeps['@biomejs/biome'] = args.biome
  }

  if (args.eslint) {
    assertAllowedPackage('eslint')
    const eslintVersion = args.eslint
    lintDevDeps.eslint = eslintVersion

    const eslintJsVersion = args.eslintJs || eslintVersion
    assertAllowedPackage('@eslint/js')
    lintDevDeps['@eslint/js'] = eslintJsVersion

    const parserVersion = args.tsEslintParser || getLatest('@typescript-eslint/parser')
    assertAllowedPackage('@typescript-eslint/parser')
    lintDevDeps['@typescript-eslint/parser'] = parserVersion

    const configPrettier = args.eslintConfigPrettier || getLatest('eslint-config-prettier')
    assertAllowedPackage('eslint-config-prettier')
    lintDevDeps['eslint-config-prettier'] = configPrettier
  }

  if (args.prettier) {
    assertAllowedPackage('prettier')
    lintDevDeps.prettier = args.prettier
  }

  return { versions, lintDevDeps }
}
