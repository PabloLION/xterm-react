import fs from 'node:fs'
import path from 'node:path'

export function applyPins({ appDir, distDir, tarballName, versions, lintDevDeps }) {
  const pkgPath = path.join(appDir, 'package.json')
  const originalPkg = fs.readFileSync(pkgPath, 'utf8')
  const pkg = JSON.parse(originalPkg)

  const tarballAbsolute = path.join(distDir, tarballName)
  const tarballRelative = path.relative(appDir, tarballAbsolute).split(path.sep).join('/')
  const tarballSpecifier = tarballRelative.startsWith('.') ? `file:${tarballRelative}` : `file:./${tarballRelative}`

  pkg.dependencies = {
    ...(pkg.dependencies || {}),
    react: versions.react,
    'react-dom': versions['react-dom'],
    '@pablo-lion/xterm-react': tarballSpecifier
  }

  pkg.devDependencies = {
    ...(pkg.devDependencies || {}),
    typescript: versions.typescript,
    '@types/react': versions['@types/react'],
    '@types/react-dom': versions['@types/react-dom'],
    vite: versions.vite,
    '@vitejs/plugin-react': versions['@vitejs/plugin-react'],
    ...lintDevDeps
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  return { pkgPath, originalPkg }
}

export function restorePackage(pkgPath, contents) {
  fs.writeFileSync(pkgPath, contents)
}
