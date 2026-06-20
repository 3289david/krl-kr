/**
 * KRL.KR — Local File Storage
 * Stores uploaded files on VPS disk.
 * Configure UPLOAD_DIR environment variable.
 */
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

export async function ensureUploadDir(): Promise<void> {
  const dir = getUploadDir();
  await fs.mkdir(dir, { recursive: true });
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _mimeType?: string
): Promise<{ key: string; path: string; size: number }> {
  await ensureUploadDir();

  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const key = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const filePath = path.join(getUploadDir(), key);

  await fs.writeFile(filePath, buffer);

  return { key, path: filePath, size: buffer.length };
}

/** Resolve a storage key to its absolute disk path (sync, no I/O). */
export function getFilePath(key: string): string {
  return path.join(getUploadDir(), key);
}

export async function getFile(key: string): Promise<Buffer | null> {
  const filePath = path.join(getUploadDir(), key);
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  const filePath = path.join(getUploadDir(), key);
  try {
    await fs.unlink(filePath);
  } catch {}
}

export async function getFileStats(
  key: string
): Promise<{ size: number; exists: boolean }> {
  const filePath = path.join(getUploadDir(), key);
  try {
    const stat = await fs.stat(filePath);
    return { size: stat.size, exists: true };
  } catch {
    return { size: 0, exists: false };
  }
}
