import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";

const operation = process.argv[2];
const projectId = "limited-502918";
const cloudArchive =
  "gs://limited-502918-cheap-gcs/technology/technology-data.tar.gz";
const dataDirectory = resolve("data");
const temporaryDirectory = mkdtempSync(resolve(".tmp-private-data-"));
const archivePath = resolve(temporaryDirectory, "technology-data.tar.gz");
const extractedDirectory = resolve(temporaryDirectory, "extracted");

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function runGcloud(args) {
  if (process.platform === "win32") {
    run(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "gcloud", ...args]);
    return;
  }

  run("gcloud", args);
}

function pull() {
  mkdirSync(extractedDirectory);
  runGcloud([
    "storage",
    "cp",
    cloudArchive,
    archivePath,
    `--project=${projectId}`,
  ]);
  run("tar", ["-xzf", archivePath, "-C", extractedDirectory]);

  if (readdirSync(extractedDirectory).length === 0) {
    throw new Error("The private data archive is empty.");
  }

  rmSync(dataDirectory, { recursive: true, force: true });
  renameSync(extractedDirectory, dataDirectory);
}

function push() {
  if (!existsSync(dataDirectory)) {
    throw new Error("The local data directory does not exist.");
  }

  run("tar", ["-czf", archivePath, "-C", dataDirectory, "."]);
  runGcloud([
    "storage",
    "cp",
    archivePath,
    cloudArchive,
    `--project=${projectId}`,
  ]);
}

try {
  if (operation === "pull") {
    pull();
  } else if (operation === "push") {
    push();
  } else {
    throw new Error("Usage: sync-private-data.mjs <pull|push>");
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
