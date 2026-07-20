export function withBasePath(path: string) {
  if (/^(?:[a-z]+:|#)/i.test(path)) {
    return path;
  }

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}` || "/";
}

export function markdownPath(path: string) {
  return path === "/" ? "/index.md" : `${path.replace(/\/$/, "")}.md`;
}
