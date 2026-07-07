import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Local-disk file storage. Replaces the Manus/S3 "forge" storage.
 *
 * Files are written under UPLOAD_DIR (default: ./uploads) and served by the
 * Express app at /uploads/<key>. To move to cloud storage (S3, R2, etc.),
 * swap the body of `storagePut` — the returned `{ key, url }` shape is all the
 * rest of the app depends on.
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "uploads");

export function getUploadDir(): string {
  return UPLOAD_DIR;
}

export async function storagePut(
  key: string,
  data: Buffer,
  _mimeType?: string,
): Promise<{ key: string; url: string }> {
  const filePath = path.join(UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  return { key, url: `/uploads/${key}` };
}

export async function storageDelete(key: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, key);
  await fs.rm(filePath, { force: true });
}
