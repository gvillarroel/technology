const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;
const ASSET_OR_ANCHOR_PATTERN = /^(#|mailto:|tel:)/i;
import { withBasePath } from "./site-url";

function shouldRewriteLink(url: string) {
  return !ABSOLUTE_URL_PATTERN.test(url) && !ASSET_OR_ANCHOR_PATTERN.test(url);
}

export function toMarkdownHref(url: string) {
  if (!shouldRewriteLink(url)) {
    return url;
  }

  const [pathname, hash = ""] = url.split("#");
  const normalized = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (!normalized || normalized.endsWith(".md")) {
    return url;
  }

  const suffix = hash ? `#${hash}` : "";
  return `${normalized}.md${suffix}`;
}

export function rewriteMarkdownLinks(source: string) {
  return source.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, url: string) => {
    return `[${label}](${toMarkdownHref(url)})`;
  });
}

export function getHtmlPageUrl(slug: string) {
  return withBasePath(`/spikes/dual-format/${slug}/`);
}

export function getMarkdownPageUrl(slug: string) {
  return withBasePath(`/spikes/dual-format/${slug}.md`);
}

export function getScopedHtmlPageUrl(basePath: string, slug: string) {
  return withBasePath(`${basePath}/${slug}/`);
}

export function getScopedMarkdownPageUrl(basePath: string, slug: string) {
  return withBasePath(`${basePath}/${slug}.md`);
}
