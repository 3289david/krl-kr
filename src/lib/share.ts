import { randomUUID } from "crypto";
export function generateShareToken(): string {
  return randomUUID().replace(/-/g, "");
}
