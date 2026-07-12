// Google OAuth のドメイン制限。
// hd パラメータはあくまで「ヒント」なので、必ずサーバー側でも検証する
// (auth/callback と proxy.ts の両方でこの関数を通す)。

export function allowedDomain(): string {
  return process.env.NEXT_PUBLIC_ALLOWED_GOOGLE_DOMAIN ?? "";
}

export function isAllowedEmail(email: string | undefined | null): boolean {
  const domain = allowedDomain();
  if (!domain) return true; // 未設定なら制限なし (開発用)
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}
