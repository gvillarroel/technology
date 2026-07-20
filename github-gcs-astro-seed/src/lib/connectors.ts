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

export type SourceFormat = "json" | "jsonl";

export function getSourceFormat(uri: string): SourceFormat {
  const pathname = uri.split(/[?#]/, 1)[0].toLowerCase();

  if (pathname.endsWith(".jsonl")) {
    return "jsonl";
  }

  if (pathname.endsWith(".json")) {
    return "json";
  }

  throw new Error(`Source URI must end in .json or .jsonl: ${uri}`);
}

export async function readSourceData(uri: string): Promise<unknown> {
  const text = await readSourceText(uri);

  if (getSourceFormat(uri) === "json") {
    return JSON.parse(text) as unknown;
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as unknown;
      } catch (error) {
        throw new Error(`Invalid JSONL record ${index + 1} in ${uri}`, { cause: error });
      }
    });
}
