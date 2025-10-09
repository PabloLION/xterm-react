const EMPTY_CSS_MODULE = new URL('./stubs/empty-css.js', import.meta.url).href
const STUB_XTERM_MODULE = new URL('./stubs/xterm-react.js', import.meta.url).href

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.endsWith('.css')) {
    return { url: EMPTY_CSS_MODULE, shortCircuit: true }
  }
  if (specifier === '@pablo-lion/xterm-react') {
    return { url: STUB_XTERM_MODULE, shortCircuit: true }
  }
  return defaultResolve(specifier, context, defaultResolve)
}
