import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
} catch {
  console.warn("Skipping git hook installation because this directory is not a git worktree.");
  process.exit(0);
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: process.cwd(),
  stdio: "ignore",
});

console.log("Configured git hooks path to .githooks");
