import { execSync } from 'node:child_process'
import { assertAllowedPackage } from './pin-config.js'

export interface ResolveArgs {
  react?: string
  reactDom?: string
  typescript?: string
  vite?: string
  pluginReact?: string
  typesReact?: string
  typesReactDom?: string
  biome?: string
  eslint?: string
  eslintJs?: string
  tsEslintParser?: string
  eslintConfigPrettier?: string
  prettier?: string
}

export interface ResolveVersionsResult {
  versions: Record<string, string>
  lintDevDeps: Record<string, string>
}

function view(command: string): string {
  return execSync(command, { stdio: 'pipe' }).toString().trim()
}

export function getLatest(name: string): string {
  assertAllowedPackage(name)
  return view(`pnpm view ${name} version`)
}

export function pickLatestForMajor(versions: string[], major: string): string | null {
  const filtered = versions.filter(v => String(v).startsWith(`${major}.`))
  return filtered[filtered.length - 1] || null
}

export function getLatestForMajor(name: string, major: string): string {
  assertAllowedPackage(name)
  try {
    const raw = view(`pnpm view ${name} versions --json`)
    const versions = JSON.parse(raw) as string[]
    return pickLatestForMajor(versions, major) || getLatest(name)
  } catch {
    return getLatest(name)
  }
}

export function resolveConsumerVersions(args: ResolveArgs): ResolveVersionsResult {
  const react = args.react || getLatest('react')
  const reactDom = args.reactDom || getLatest('react-dom')
  const reactMajor = String(react).split('.')[0]

  const versions: Record<string, string> = {
    react,
    'react-dom': reactDom,
    typescript: args.typescript || getLatest('typescript'),
    '@types/react': args.typesReact || getLatestForMajor('@types/react', reactMajor),
    '@types/react-dom': args.typesReactDom || getLatestForMajor('@types/react-dom', reactMajor),
    vite: args.vite || getLatest('vite'),
    '@vitejs/plugin-react': args.pluginReact || getLatest('@vitejs/plugin-react')
  }

  const lintDevDeps: Record<string, string> = {}

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
