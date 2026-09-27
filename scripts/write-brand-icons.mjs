/**
 * Rasterize the shared logo mark into favicon, PWA, and black splash images.
 * Run: node scripts/write-brand-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { logoDots, logoMarkSvg } from "../src/lib/logo-mark.js";
import { splashStartupImages } from "../src/lib/splash.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paintMark(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) rgba[i * 4 + 3] = 255;
  const scale = size / 32;
  const dots = logoDots();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0;
      for (const dot of dots) {
        const dx = x + 0.5 - dot.cx * scale;
        const dy = y + 0.5 - dot.cy * scale;
        const edge = Math.hypot(dx, dy) - dot.r * scale;
        if (edge <= -0.75) {
          cover = 1;
          break;
        }
        if (edge < 0.75) cover = Math.max(cover, 0.5 - edge / 1.5);
      }
      if (cover > 0) {
        const i = (y * size + x) * 4;
        const v = Math.round(255 * Math.min(1, cover));
        rgba[i] = v;
        rgba[i + 1] = v;
        rgba[i + 2] = v;
      }
    }
  }
  return rgba;
}

function blackPlate(width, height, mark, markSize) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba[i * 4 + 3] = 255;
  const ox = Math.floor((width - markSize) / 2);
  const oy = Math.floor((height - markSize) / 2);
  for (let y = 0; y < markSize; y++) {
    mark.copy(rgba, ((oy + y) * width + ox) * 4, y * markSize * 4, (y + 1) * markSize * 4);
  }
  return encodePng(width, height, rgba);
}

function encodeIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const blobs = pngs.map((png, index) => {
    const size = Math.round(Math.sqrt(png.width * png.height));
    const at = index * 16;
    entries[at] = size >= 256 ? 0 : size;
    entries[at + 1] = size >= 256 ? 0 : size;
    entries.writeUInt16LE(1, at + 4);
    entries.writeUInt16LE(32, at + 6);
    entries.writeUInt32LE(png.data.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += png.data.length;
    return png.data;
  });
  return Buffer.concat([header, entries, ...blobs]);
}

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

const svg = logoMarkSvg();
const mask = logoMarkSvg({ color: "#000000", background: null });
write(join(root, "src/app/icon.svg"), svg);
write(join(root, "public/icons/icon.svg"), svg);
write(join(root, "public/icons/mask.svg"), mask);

const sizes = [16, 32, 48, 150, 180, 192, 512];
const pngs = new Map(sizes.map((size) => [size, { width: size, height: size, data: encodePng(size, size, paintMark(size)) }]));

write(join(root, "src/app/favicon.ico"), encodeIco([pngs.get(16), pngs.get(32), pngs.get(48)]));
write(join(root, "src/app/apple-icon.png"), pngs.get(180).data);
write(join(root, "public/icons/apple-touch-icon.png"), pngs.get(180).data);
write(join(root, "public/icons/icon-32.png"), pngs.get(32).data);
write(join(root, "public/icons/icon-150.png"), pngs.get(150).data);
write(join(root, "public/icons/icon-192.png"), pngs.get(192).data);
write(join(root, "public/icons/icon-512.png"), pngs.get(512).data);

const markSize = 256;
const mark = paintMark(markSize);
const seen = new Set();
for (const splash of splashStartupImages()) {
  const key = `${splash.width}x${splash.height}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const logo = Math.round(Math.min(splash.width, splash.height) * 0.16);
  const scaled = logo === markSize ? mark : paintMark(logo);
  write(join(root, "public", splash.url), blackPlate(splash.width, splash.height, scaled, logo));
}

console.log(`wrote icons and ${seen.size} splash images`);
