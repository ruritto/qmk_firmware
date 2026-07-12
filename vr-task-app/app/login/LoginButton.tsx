"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { allowedDomain } from "@/lib/auth";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const supabase = createClient();
    const domain = allowedDomain();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/`,
        queryParams: {
          prompt: "select_account",
          // hd はドメイン候補の絞り込み (最終検証はサーバー側で実施)
          ...(domain ? { hd: domain } : {}),
        },
      },
    });
  };

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-6 py-3.5 text-base font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.61l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
        />
      </svg>
      {loading ? "リダイレクト中…" : "Google でログイン"}
    </button>
  );
}
