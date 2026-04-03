import { defineConfig } from "astro/config";

function getPagesConfig() {
  const repository = process.env.GITHUB_REPOSITORY;
  const owner = process.env.GITHUB_REPOSITORY_OWNER;

  if (!repository || !owner) {
    return {
      site: undefined,
      base: "/",
    };
  }

  const [, repo] = repository.split("/");
  const isUserOrOrgSite = repo === `${owner}.github.io`;

  return {
    site: `https://${owner}.github.io`,
    base: isUserOrOrgSite ? "/" : `/${repo}`,
  };
}

const { site, base } = getPagesConfig();

export default defineConfig({
  output: "static",
  site,
  base,
});
