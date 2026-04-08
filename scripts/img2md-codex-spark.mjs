#!/usr/bin/env zx

import { $, quote } from "zx";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

$.quote = quote;

const DEFAULT_MODEL = process.env.IMG2MD_MODEL?.trim() || "gpt-5.3-codex-spark";
const DEFAULT_OUTPUT_ROOT = ".tmp/img2md";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]);
const EXCLUDED_SEGMENTS = new Set([
  ".artifacts",
  ".astro",
  ".git",
  "dist",
  "node_modules",
  "test-results",
]);
const PROMPT = [
  "Convert the attached image into Markdown.",
  "Transcribe all visible text.",
  "Preserve headings, labels, list items, tables, code, commands, and short UI groupings when clearly visible.",
  "Do not describe the image.",
  "Do not add commentary.",
  "Return Markdown only.",
].join(" ");

function printHelp() {
  console.log(`Usage: npx zx scripts/img2md-codex-spark.mjs [options]

Options:
  --input-root <dir>    Root directory to scan for images. Default: current directory
  --output-root <dir>   Markdown output directory. Default: ${DEFAULT_OUTPUT_ROOT}
  --model <name>        Model name. Default: ${DEFAULT_MODEL}
  --limit <n>           Process only the first N images
  --include-artifacts   Include .artifacts images
  --overwrite           Rewrite existing .md files
  --help                Show this help

Environment:
  OPENAI_API_KEY        Required. Used for the OpenAI Responses API.
  IMG2MD_MODEL          Optional default model override.
`);
}

function parseArgs(argv) {
  const options = {
    inputRoot: ".",
    outputRoot: DEFAULT_OUTPUT_ROOT,
    model: DEFAULT_MODEL,
    limit: Number.POSITIVE_INFINITY,
    includeArtifacts: false,
    overwrite: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help") {
      options.help = true;
      continue;
    }

    if (argument === "--include-artifacts") {
      options.includeArtifacts = true;
      continue;
    }

    if (argument === "--overwrite") {
      options.overwrite = true;
      continue;
    }

    if (argument === "--input-root") {
      options.inputRoot = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === "--output-root") {
      options.outputRoot = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === "--model") {
      options.model = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === "--limit") {
      options.limit = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function isExcluded(relativePath, includeArtifacts) {
  return relativePath.split(path.sep).some((segment) => {
    if (segment === ".tmp") {
      return true;
    }

    if (segment === ".artifacts") {
      return !includeArtifacts;
    }

    return EXCLUDED_SEGMENTS.has(segment);
  });
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function toOutputPath(outputRoot, relativePath) {
  const safeName = relativePath.replaceAll("\\", "__").replaceAll("/", "__");
  return path.join(outputRoot, `${safeName}.md`);
}

async function collectImages(rootDir, includeArtifacts) {
  const results = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, absolutePath);

      if (isExcluded(relativePath, includeArtifacts)) {
        continue;
      }

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(extension)) {
        results.push({ absolutePath, relativePath });
      }
    }
  }

  await visit(rootDir);
  results.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return results;
}

function getMimeType(imagePath) {
  const extension = path.extname(imagePath).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".bmp":
      return "image/bmp";
    default:
      throw new Error(`Unsupported image type: ${extension}`);
  }
}

async function imageToDataUrl(imagePath) {
  const mimeType = getMimeType(imagePath);
  const base64 = (await fs.readFile(imagePath)).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function extractOutputText(responseBody) {
  if (typeof responseBody.output_text === "string" && responseBody.output_text.trim()) {
    return responseBody.output_text.trim();
  }

  const outputItems = Array.isArray(responseBody.output) ? responseBody.output : [];
  const chunks = [];

  for (const item of outputItems) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (typeof contentItem.text === "string" && contentItem.text.trim()) {
        chunks.push(contentItem.text.trim());
      }
    }
  }

  return chunks.join("\n\n").trim();
}

function wrapMarkdown(relativePath, model, markdown) {
  const body = markdown.trim() || "_No Markdown returned by the model._";

  return [
    `# ${path.basename(relativePath)}`,
    "",
    `- Source image: \`${toPosix(relativePath)}\``,
    `- Model: \`${model}\``,
    "",
    body,
    "",
  ].join("\n");
}

async function callResponsesApi({ apiKey, model, imagePath }) {
  const imageUrl = await imageToDataUrl(imagePath);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: PROMPT },
            { type: "input_image", image_url: imageUrl },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API request failed (${response.status}): ${errorText}`);
  }

  const body = await response.json();
  return extractOutputText(body);
}

async function writeIndex({ outputRoot, written, skipped, failed }) {
  const lines = [
    "# Image To Markdown",
    "",
    `- Written: ${written.length}`,
    `- Skipped: ${skipped.length}`,
    `- Failed: ${failed.length}`,
    "",
    "## Written",
    "",
  ];

  for (const item of written) {
    lines.push(`- [${item.relativePath}](./${path.basename(item.outputPath)})`);
  }

  lines.push("", "## Skipped", "");

  for (const item of skipped) {
    lines.push(`- ${item.relativePath}`);
  }

  lines.push("", "## Failed", "");

  for (const item of failed) {
    lines.push(`- ${item.relativePath}: ${item.error}`);
  }

  lines.push("");
  await fs.writeFile(path.join(outputRoot, "index.md"), lines.join("\n"), "utf8");
}

async function loadCodexAccessToken() {
  const authPath = path.join(process.env.USERPROFILE || process.env.HOME || "", ".codex", "auth.json");

  try {
    const raw = await fs.readFile(authPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.tokens?.access_token?.trim() || "";
  } catch {
    return "";
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(3));
  if (options.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim() || (await loadCodexAccessToken());
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or a Codex access token is required.");
  }

  const inputRoot = path.resolve(options.inputRoot);
  const outputRoot = path.resolve(options.outputRoot);
  await fs.mkdir(outputRoot, { recursive: true });

  const images = await collectImages(inputRoot, options.includeArtifacts);
  const selectedImages = images.slice(0, Number.isFinite(options.limit) ? options.limit : images.length);
  const written = [];
  const skipped = [];
  const failed = [];

  for (const [index, image] of selectedImages.entries()) {
    const outputPath = toOutputPath(outputRoot, image.relativePath);

    if (!options.overwrite) {
      try {
        await fs.stat(outputPath);
        skipped.push({ relativePath: image.relativePath });
        console.log(`[${index + 1}/${selectedImages.length}] skip ${toPosix(image.relativePath)}`);
        continue;
      } catch {
        // File does not exist; continue.
      }
    }

    try {
      const markdown = await callResponsesApi({
        apiKey,
        model: options.model,
        imagePath: image.absolutePath,
      });

      await fs.writeFile(
        outputPath,
        wrapMarkdown(image.relativePath, options.model, markdown),
        "utf8",
      );

      written.push({ relativePath: image.relativePath, outputPath });
      console.log(`[${index + 1}/${selectedImages.length}] wrote ${toPosix(image.relativePath)}`);
    } catch (error) {
      failed.push({
        relativePath: image.relativePath,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`[${index + 1}/${selectedImages.length}] fail ${toPosix(image.relativePath)}`);
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  await writeIndex({ outputRoot, written, skipped, failed });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
