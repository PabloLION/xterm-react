export default function getBanner() {
  const timestamp = new Date().toISOString();
  return `Rendered at ${timestamp}`;
}
