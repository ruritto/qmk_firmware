import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// サーバーコンポーネント / Route Handler 用 Supabase クライアント
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // サーバーコンポーネントからの呼び出しでは cookie を書けない。
            // セッション更新は proxy (ミドルウェア) 側で行われるため無視してよい。
          }
        },
      },
    }
  );
}
