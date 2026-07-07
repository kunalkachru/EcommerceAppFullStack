#!/usr/bin/env node
import { spawn } from "node:child_process";
import { withTemporaryApiTargetMode } from "./lib/api-target-config.mjs";

const [, , mode, ...command] = process.argv;

if (!mode || command.length === 0) {
  console.error("Usage: node scripts/with-api-target.mjs <local|cloud> <command> [args...]");
  process.exit(1);
}

function runCommand() {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

const exitCode = await withTemporaryApiTargetMode(mode, runCommand);
process.exit(exitCode);
