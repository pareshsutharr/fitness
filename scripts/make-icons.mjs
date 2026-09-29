// Generates PWA icons (PNG) without any image dependencies.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
};
const encodePng = (size, pixel) => {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
};

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const CORAL = [255, 43, 79];
const MINT = [25, 255, 122];
const INK = [11, 13, 16];

const roundedRect = (x, y, w, h, r, px, py) => {
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  return Math.hypot(px - cx, py - cy) <= r;
};

const makeIcon = (size, { maskable = false } = {}) =>
  encodePng(size, (x, y) => {
    const u = x / size;
    const v = y / size;
    const pad = maskable ? 0 : size * 0.06;
    const radius = maskable ? 0 : size * 0.22;
    if (!roundedRect(pad, pad, size - pad * 2, size - pad * 2, radius, x + 0.5, y + 0.5)) {
      return [0, 0, 0, 0];
    }
    // dumbbell geometry in unit space
    const barH = 0.09, barW = 0.62;
    const plateW = 0.11, plateH = 0.38;
    const innerW = 0.07, innerH = 0.28;
    const cy = 0.5;
    const inBar = roundedRect(0.5 - barW / 2, cy - barH / 2, barW, barH, barH / 2, u, v);
    const inPlate =
      roundedRect(0.5 - barW / 2 - 0.02, cy - plateH / 2, plateW, plateH, 0.03, u, v) ||
      roundedRect(0.5 + barW / 2 - plateW + 0.02, cy - plateH / 2, plateW, plateH, 0.03, u, v);
    const inInner =
      roundedRect(0.5 - barW / 2 + plateW - 0.02, cy - innerH / 2, innerW, innerH, 0.02, u, v) ||
      roundedRect(0.5 + barW / 2 - plateW - innerW + 0.02, cy - innerH / 2, innerW, innerH, 0.02, u, v);
    if (inBar || inPlate || inInner) return [...INK, 255];
    const t = Math.min(1, Math.max(0, (u + v) / 2));
    return [...mix(CORAL, MINT, t), 255];
  });

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", makeIcon(192));
writeFileSync("public/icons/icon-512.png", makeIcon(512));
writeFileSync("public/icons/maskable-512.png", makeIcon(512, { maskable: true }));
writeFileSync("public/icons/apple-touch-icon.png", makeIcon(180, { maskable: true }));
writeFileSync("public/icons/badge-96.png", encodePng(96, (x, y) => {
  const u = x / 96, v = y / 96;
  const inBar = roundedRect(0.16, 0.45, 0.68, 0.1, 0.05, u, v);
  const inPlate = roundedRect(0.12, 0.3, 0.13, 0.4, 0.04, u, v) || roundedRect(0.75, 0.3, 0.13, 0.4, 0.04, u, v);
  return inBar || inPlate ? [255, 255, 255, 255] : [0, 0, 0, 0];
}));
console.log("icons written to public/icons");
