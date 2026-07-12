import { timingSafeEqual } from "crypto";

// 個人利用前提のシンプルな固定キー認証。
// Authorization: Bearer <SCRAPBOOK_API_KEY> を検証する。
export function isAuthorized(request: Request): boolean {
  const expected = process.env.SCRAPBOOK_API_KEY;
  if (!expected) return false; // キー未設定なら外部APIは全拒否

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
