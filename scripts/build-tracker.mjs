import { minify } from "terser";
import { gzipSync } from "zlib";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = join(root, "tracker", "uplitycs.src.js");
const outPaths = [join(root, "public", "uplitycs.js")];
const MAX_GZIP = 1024;

const source = readFileSync(srcPath, "utf8");
const result = await minify(source, {
  compress: {
    passes: 3,
    unsafe: true,
    drop_console: true,
  },
  mangle: true,
  format: { comments: false },
});

if (!result.code) {
  console.error("Tracker minify failed");
  process.exit(1);
}

for (const outPath of outPaths) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, result.code);
}

const gzipSize = gzipSync(result.code).length;
const rawSize = Buffer.byteLength(result.code);

console.log(
  `uplitycs.js  raw=${rawSize}B  gzip=${gzipSize}B  limit=${MAX_GZIP}B`,
);

if (gzipSize > MAX_GZIP) {
  console.error(
    `FAIL: tracker is ${gzipSize} bytes gzipped (max ${MAX_GZIP}).`,
  );
  process.exit(1);
}
