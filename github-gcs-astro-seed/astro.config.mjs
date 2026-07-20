import { defineConfig } from "astro/config";

function getGitHubPagesConfig() {
  const repository = process.env.GITHUB_REPOSITORY;
  const owner = process.env.GITHUB_REPOSITORY_OWNER;

  if (!repository || !owner) {
    return { site: undefined, base: "/" };
  }

  const [, name] = repository.split("/");
  const rootSite = name === `${owner}.github.io`;

  return {
    site: `https://${owner}.github.io`,
    base: rootSite ? "/" : `/${name}`,
  };
}

export default defineConfig({
  output: "static",
  compressHTML: true,
  ...getGitHubPagesConfig(),
});
