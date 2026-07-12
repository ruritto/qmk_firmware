import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// DB接続の唯一の入口。ここを差し替えるだけでホスティング先のマネージドDBに移行できる。
// - ローカル: DATABASE_URL="file:./dev.db" の SQLite ファイル
// - 本番:     TURSO_DATABASE_URL / TURSO_AUTH_TOKEN を設定すると Turso (libsql) に接続
// - Supabase 等の Postgres に移す場合は schema.prisma の provider を変えてここを素の
//   PrismaClient に戻すだけでよい (アプリコードは prisma.item.* しか触らない)
function createClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

// Next.js の開発サーバーはホットリロードでモジュールを再評価するため、
// グローバルにキャッシュして接続の増殖を防ぐ
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
