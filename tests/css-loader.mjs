const EMPTY_CSS_MODULE = 'data:text/javascript,export default {}\n'
const STUB_XTERM_MODULE = 'data:text/javascript,export const XTerm = () => null; export default { XTerm };\n'

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.endsWith('.css')) {
    return { url: EMPTY_CSS_MODULE }
  }
  if (specifier === '@pablo-lion/xterm-react') {
    return { url: STUB_XTERM_MODULE }
  }
  return defaultResolve(specifier, context, defaultResolve)
}

export async function load(url, context, defaultLoad) {
  if (url === EMPTY_CSS_MODULE) {
    return { format: 'module', source: 'export default {}', shortCircuit: true }
  }
  if (url === STUB_XTERM_MODULE) {
    return {
      format: 'module',
      source: 'export const XTerm = (props) => ({ type: "div", props: { ...props, "data-stub": "xterm" } });\nexport default { XTerm };',
      shortCircuit: true
    }
  }
  return defaultLoad(url, context, defaultLoad)
}
