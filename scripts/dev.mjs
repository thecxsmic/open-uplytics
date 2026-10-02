#!/usr/bin/env node
/**
 * npm run dev — refuse to start when setup has not filled the required env.
 */
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { REQUIRED_ENV, ROOT, envGap, loadProjectEnv } from "./load-env.mjs";

loadProjectEnv();

const gaps = REQUIRED_ENV.map((key) => ({ key, gap: envGap(key) })).filter((item) => item.gap);
if (gaps.length) {
  console.error("These envs are not there:");
  for (const item of gaps) {
    const note = item.gap === "is not there" ? "" : ` (${item.gap.replace(/^is /, "")})`;
    console.error(`  ${item.key}${note}`);
  }
  console.error("");
  if (!existsSync(join(ROOT, ".env"))) {
    console.error("There is no .env file.");
  }
  console.error("Run npm run setup, then npm run dev again.");
  process.exit(1);
}

const child = spawn(process.execPath, [join(ROOT, "node_modules/next/dist/bin/next"), "dev", "--webpack"], {
  cwd: ROOT,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
