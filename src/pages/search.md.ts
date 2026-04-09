import { getSearchPageMarkdownResponse } from "../lib/search";

export async function GET() {
  return getSearchPageMarkdownResponse("", "");
}
