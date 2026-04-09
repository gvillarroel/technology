import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_MODEL = process.env.IMG2MD_MODEL?.trim() || "google/gemini-3-flash-preview";
const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), ".tmp", "img2md");
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]);
const EXCLUDED_SEGMENTS = new Set([
  ".artifacts",
  ".astro",
  ".git",
  ".tmp",
  "dist",
  "node_modules",
  "test-results",
]);

const PROMPT = `
Analyze this UI screenshot and return Markdown only.

Goal:
- Capture the visible UI content.
- Indicate where each block is located as precisely as possible.

Requirements:
- Use English only.
- Preserve visible labels, commands, navigation items, headings, table headers, values, code-like text, and short paragraphs.
- Prefer structure over raw OCR dumping.
- If text is uncertain, mark it with [?].
- Do not describe the image.
- Do not explain your process.
- Do not wrap the answer in code fences.

Output shape:
# Screen Summary
- One short summary of what this screen is.

## Layout Map
| Region | Approx position | Approx bounds (%) | What is there |
|---|---|---|---|

## Regions
### <Region name>
- Position: top-left / top-center / top-right / left rail / center / right rail / bottom etc.
- Bounds: x=<0-100>% y=<0-100>% w=<0-100>% h=<0-100>%
- Role: header / sidebar / toolbar / card / table / dialog / terminal / content area / footer / other
- Visible content:
  - item
  - item
  - item

Rules for precision:
- Bounds must be approximate but concrete percentages.
- Split the page into multiple regions when the layout clearly has separate blocks.
- Prefer 4-12 meaningful regions depending on complexity.
- Include text inside cards, tables, menus, inputs, and code blocks when readable.
`.trim();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const options = {
    inputRoot: process.cwd(),
    outputRoot: DEFAULT_OUTPUT_ROOT,
    model: DEFAULT_MODEL,
    limit: Number.POSITIVE_INFINITY,
    overwrite: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help") {
      options.help = true;
      continue;
    }

    if (argument === "--overwrite") {
      options.overwrite = true;
      continue;
    }

    if (argument === "--input-root") {
      options.inputRoot = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (argument === "--output-root") {
      options.outputRoot = path.resolve(argv[index + 1]);
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

function printHelp() {
  console.log(`Usage: node scripts/img2md-openrouter-gemini3flash.mjs [options]

Options:
  --input-root <dir>    Root directory to scan for images. Default: current directory
  --output-root <dir>   Markdown output directory. Default: .tmp/img2md
  --model <name>        OpenRouter model name. Default: ${DEFAULT_MODEL}
  --limit <n>           Process only the first N images
  --overwrite           Rewrite existing .md files
  --help                Show this help

Environment:
  OPENROUTER_API_KEY    Required
  IMG2MD_MODEL          Optional default model override
`);
}

function isExcluded(relativePath) {
  return relativePath.split(path.sep).some((segment) => EXCLUDED_SEGMENTS.has(segment));
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function toOutputPath(outputRoot, relativePath) {
  const safeName = relativePath.replaceAll("\\", "__").replaceAll("/", "__");
  return path.join(outputRoot, `${safeName}.md`);
}

async function collectImages(rootDir) {
  const results = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, absolutePath);

      if (isExcluded(relativePath)) {
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

async function callOpenRouter({ apiKey, model, imagePath }) {
  const imageUrl = await imageToDataUrl(imagePath);

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://local.codex",
        "X-Title": "technology-img2md",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
      }),
    });

    const raw = await response.text();
    if (response.ok) {
      const body = JSON.parse(raw);
      const text = body?.choices?.[0]?.message?.content?.trim() || "";
      if (!text) {
        throw new Error(`OpenRouter returned no text for ${path.basename(imagePath)}.`);
      }
      return text;
    }

    const isRetryable = response.status === 429 || response.status >= 500;
    if (!isRetryable || attempt === 4) {
      throw new Error(`OpenRouter request failed (${response.status}): ${raw}`);
    }

    await sleep(1500 * attempt);
  }

  throw new Error("OpenRouter request exhausted retries.");
}

function wrapMarkdown(relativePath, model, markdown) {
  return [
    `# ${path.basename(relativePath)}`,
    "",
    `- Source image: \`${toPosix(relativePath)}\``,
    `- Model: \`${model}\``,
    "",
    markdown.trim(),
    "",
  ].join("\n");
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
    ...written.map((item) => `- [${item.relativePath}](./${path.basename(item.outputPath)})`),
    "",
    "## Skipped",
    "",
    ...skipped.map((item) => `- ${item.relativePath}`),
    "",
    "## Failed",
    "",
    ...failed.map((item) => `- ${item.relativePath}: ${item.error}`),
    "",
  ];

  await fs.writeFile(path.join(outputRoot, "index.md"), lines.join("\n"), "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required.");
  }

  await fs.mkdir(options.outputRoot, { recursive: true });
  const images = await collectImages(options.inputRoot);
  const selectedImages = images.slice(0, Number.isFinite(options.limit) ? options.limit : images.length);

  const written = [];
  const skipped = [];
  const failed = [];

  for (const [index, image] of selectedImages.entries()) {
    const outputPath = toOutputPath(options.outputRoot, image.relativePath);

    if (!options.overwrite) {
      try {
        await fs.stat(outputPath);
        skipped.push({ relativePath: image.relativePath });
        console.log(`[${index + 1}/${selectedImages.length}] skip ${toPosix(image.relativePath)}`);
        continue;
      } catch {
        // keep going
      }
    }

    try {
      const markdown = await callOpenRouter({
        apiKey,
        model: options.model,
        imagePath: image.absolutePath,
      });

      await fs.writeFile(outputPath, wrapMarkdown(image.relativePath, options.model, markdown), "utf8");
      written.push({ relativePath: image.relativePath, outputPath });
      console.log(`[${index + 1}/${selectedImages.length}] wrote ${toPosix(image.relativePath)}`);
      await sleep(400);
    } catch (error) {
      failed.push({
        relativePath: image.relativePath,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`[${index + 1}/${selectedImages.length}] fail ${toPosix(image.relativePath)}`);
      console.error(error instanceof Error ? error.message : String(error));
    }
  }

  await writeIndex({ outputRoot: options.outputRoot, written, skipped, failed });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
