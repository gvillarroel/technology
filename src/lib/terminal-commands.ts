import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export interface TerminalCommandConfig {
  command: string;
  description: string;
  kind: "builtin" | "markdown-page";
  htmlUrl: string | null;
  markdownUrl: string | null;
  fileName: string | null;
}

const terminalCommandsYamlPath = join(process.cwd(), "data", "terminal-commands.yaml");

function toScalar(value: unknown) {
  return String(value ?? "").trim();
}

function toNullableScalar(value: unknown) {
  const normalized = toScalar(value);
  return normalized || null;
}

function toKind(value: unknown): TerminalCommandConfig["kind"] {
  return String(value ?? "").trim() === "builtin" ? "builtin" : "markdown-page";
}

export async function getTerminalCommandConfigs(): Promise<TerminalCommandConfig[]> {
  const rawFile = await readFile(terminalCommandsYamlPath, "utf-8");
  const document = parse(rawFile) as { commands?: Array<Record<string, unknown>> };
  const commands = document.commands ?? [];

  return commands.map((entry) => ({
    command: toScalar(entry.command),
    description: toScalar(entry.description),
    kind: toKind(entry.kind),
    htmlUrl: toNullableScalar(entry.html_url),
    markdownUrl: toNullableScalar(entry.markdown_url),
    fileName: toNullableScalar(entry.file_name),
  }));
}
