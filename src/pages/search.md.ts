import { getSearchPageMarkdownResponse } from "../lib/search";

export const prerender = import.meta.env.PROD;

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = import.meta.env.PROD ? "" : url.searchParams.get("q") ?? "";
  const scope = import.meta.env.PROD ? "" : url.searchParams.get("scope") ?? "";

  return getSearchPageMarkdownResponse(query, scope);
}
