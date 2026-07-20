import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const sourceCache = new Map<string, Promise<string>>();

async function readGcsObject(uri: string) {
  const commandArgs = [
    "storage",
    "cat",
    uri,
    `--project=${process.env.GOOGLE_CLOUD_PROJECT ?? "limited-502918"}`,
  ];
  const options = {
    encoding: "utf8" as const,
    maxBuffer: 24 * 1024 * 1024,
  };
  const result = process.platform === "win32"
    ? await execFileAsync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "gcloud", ...commandArgs], options)
    : await execFileAsync("gcloud", commandArgs, options);

  return result.stdout;
}

async function readHttpObject(uri: string) {
  const headers = new Headers({
    Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    "User-Agent": "codex-technology",
  });
  const githubToken = process.env.GITHUB_TOKEN;

  if (githubToken && new URL(uri).hostname.endsWith("github.com")) {
    headers.set("Authorization", `Bearer ${githubToken}`);
  }

  const response = await fetch(uri, { headers });

  if (!response.ok) {
    throw new Error(`Failed to read ${uri}: ${response.status}`);
  }

  return response.text();
}

export function readSourceText(uri: string) {
  const existing = sourceCache.get(uri);

  if (existing) {
    return existing;
  }

  const request = uri.startsWith("gs://")
    ? readGcsObject(uri)
    : /^https?:\/\//i.test(uri)
      ? readHttpObject(uri)
      : Promise.reject(new Error(`Unsupported source connector for ${uri}`));

  sourceCache.set(uri, request);
  return request;
}

export async function readSourceJson<T>(uri: string): Promise<T> {
  return JSON.parse(await readSourceText(uri)) as T;
}
