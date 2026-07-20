import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cache = new Map<string, Promise<string>>();
const githubHosts = new Set(["api.github.com", "github.com", "raw.githubusercontent.com"]);

async function readGcs(uri: string) {
  const args = ["storage", "cat", uri];
  const options = { encoding: "utf8" as const, maxBuffer: 16 * 1024 * 1024 };
  const result = process.platform === "win32"
    ? await execFileAsync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "gcloud", ...args], options)
    : await execFileAsync("gcloud", args, options);

  return result.stdout;
}

async function readHttp(uri: string) {
  const url = new URL(uri);
  const headers = new Headers({
    Accept: "application/vnd.github.raw+json, application/json, text/plain;q=0.9",
    "User-Agent": "github-gcs-astro-seed",
  });

  if (process.env.GITHUB_TOKEN && githubHosts.has(url.hostname)) {
    headers.set("Authorization", `Bearer ${process.env.GITHUB_TOKEN}`);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers });

      if (response.ok) {
        return response.text();
      }

      if (response.status !== 429 && response.status < 500) {
        throw new Error(`Failed to read ${uri}: HTTP ${response.status}`);
      }

      if (attempt === 2) {
        throw new Error(`Failed to read ${uri}: HTTP ${response.status}`);
      }
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
  }

  throw new Error(`Failed to read ${uri}`);
}

export function readSourceText(uri: string) {
  const cached = cache.get(uri);

  if (cached) {
    return cached;
  }

  const request = uri.startsWith("gs://")
    ? readGcs(uri)
    : /^https?:\/\//i.test(uri)
      ? readHttp(uri)
      : Promise.reject(new Error(`Unsupported source URI: ${uri}`));

  cache.set(uri, request);
  return request;
}

export async function readSourceJson<T>(uri: string): Promise<T> {
  return JSON.parse(await readSourceText(uri)) as T;
}
