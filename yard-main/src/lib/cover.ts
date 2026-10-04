export function coverUrl(src: string, width = 640) {
  if (!src) return "";
  return `${src}${src.includes("?") ? "&" : "?"}width=${width}`;
}
