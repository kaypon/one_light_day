// `npm run check:secrets` — fails if any value from a local .env file shows up in
// a git-tracked file or in the built output that gets served to browsers.
// Prints file names only, never the values. Runs on every commit via .githooks.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { findLeaks, parseEnv, riskyPublicNames, secretValues, type ScanFile } from "./secret-scan.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BYTES = 5_000_000;

function envFromDisk(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const name of readdirSync(ROOT)) {
    if (name.startsWith(".env") && name !== ".env.example") {
      Object.assign(env, parseEnv(readFileSync(join(ROOT, name), "utf8")));
    }
  }
  return env;
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function read(paths: string[]): ScanFile[] {
  return paths
    .filter((p) => existsSync(p) && statSync(p).isFile() && statSync(p).size <= MAX_BYTES)
    .map((p) => ({ path: relative(ROOT, p), content: readFileSync(p, "utf8") }));
}

const env = envFromDisk();
const secrets = secretValues(env);

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .map((p) => join(ROOT, p));
// What browsers receive: client bundles plus prerendered HTML/RSC payloads.
const built = [...walk(join(ROOT, ".next/static")), ...walk(join(ROOT, ".next/server/app"))];
const files = read([...tracked, ...built]);

const leaks = findLeaks(secrets, files);
const risky = riskyPublicNames(env);

if (risky.length) {
  console.error(`check:secrets: browser-exposed variables with secret-sounding names: ${risky.join(", ")}`);
}
if (leaks.length) {
  console.error(`check:secrets: secret values found in:\n  ${leaks.join("\n  ")}`);
}
if (risky.length || leaks.length) process.exit(1);

console.log(
  `check:secrets: ok, ${secrets.length} secret value(s) checked against ${files.length} files (${built.length} built).`,
);
