const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;
const NON_PATH_PATTERN = /^(#|mailto:|tel:)/i;

function getBaseUrl() {
  const repository = process.env.GITHUB_REPOSITORY;
  const owner = process.env.GITHUB_REPOSITORY_OWNER;

  if (!repository || !owner) {
    return "/";
  }

  const [, repo] = repository.split("/");
  const isUserOrOrgSite = repo === `${owner}.github.io`;
  const baseUrl = isUserOrOrgSite ? "/" : `/${repo}/`;

  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export function withBasePath(path: string) {
  if (!path || ABSOLUTE_URL_PATTERN.test(path) || NON_PATH_PATTERN.test(path)) {
    return path;
  }

  const baseUrl = getBaseUrl();
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  if (path === "/") {
    return baseUrl;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedPath.startsWith(`${baseUrl}`) || normalizedPath === trimmedBase) {
    return normalizedPath;
  }

  return `${trimmedBase}${normalizedPath}`;
}
