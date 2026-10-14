/**
 * Membungkus source code web app menjadi file zip yang bisa diunduh
 * dari dalam aplikasi (public/rotanami-source-code.zip).
 *
 * Jalankan: npx tsx scripts/pack-source.ts
 * Otomatis dijalankan saat `npm run build` melalui script prebuild.
 */
import { existsSync, mkdirSync, statSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { zip } from "fflate";

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, "public");
const OUT_FILE = path.join(OUT_DIR, "rotanami-source-code.zip");

/** Folder/berkas yang TIDAK ikut dibungkus. */
const EXCLUDE_PATTERNS = [
  /^\.git(\/|\\|$)/,
  /^node_modules(\/|\\|$)/,
  /^\.next(\/|\\|$)/,
  /^\.kilo(\/|\\|$)/,
  /^public\/rotanami-source-code\.zip$/,
  /^\.env$/,
  /^\.env\.local$/,
  /^\.env\.production$/,
  /^tsconfig\.tsbuildinfo$/,
  /^drizzle\/meta\/_journal\.json$/,
  /\.log$/,
];

function isExcluded(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  return EXCLUDE_PATTERNS.some((re) => re.test(normalized));
}

async function walk(dir: string, files: Map<string, string> = new Map()): Promise<Map<string, string>> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (isExcluded(rel)) continue;
    if (entry.isDirectory()) {
      await walk(full, files);
    } else if (entry.isFile()) {
      files.set(rel.replace(/\\/g, "/"), full);
    }
  }
  return files;
}

async function main() {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const collected = await walk(ROOT);
  const entries: Record<string, Uint8Array> = {};
  const sortedPaths = Array.from(collected.keys()).sort();
  for (const rel of sortedPaths) {
    const buf = await readFile(collected.get(rel)!);
    entries[rel] = new Uint8Array(buf);
  }

  if (sortedPaths.length === 0) {
    throw new Error("Tidak ada berkas source yang ditemukan untuk dibungkus.");
  }

  await new Promise<void>((resolve, reject) => {
    zip(entries, (err, data) => {
      if (err) return reject(err);
      writeFile(OUT_FILE, data).then(resolve).catch(reject);
    });
  });

  const sizeKb = existsSync(OUT_FILE) ? Math.round(statSync(OUT_FILE).size / 1024) : 0;
  console.log(`✓ Source code dibungkus: ${OUT_FILE} (${sortedPaths.length} berkas, ±${sizeKb} KB)`);
}

main().catch((err) => {
  console.error("Gagal membungkus source code:", err);
  // Jangan gagalkan build bila zip gagal dibuat.
  process.exit(0);
});