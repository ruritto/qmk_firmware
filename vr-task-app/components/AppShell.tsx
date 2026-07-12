"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, LogOut, NotebookPen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { TeamId } from "@/lib/types";
import { TEAMS } from "@/lib/types";
import { useState } from "react";

const NAV = [
  { href: "/", label: "タスク", icon: CalendarDays },
  { href: "/notes", label: "議事録", icon: NotebookPen },
];

// ヘッダー (PC はヘッダー内ナビ、スマホは下部タブバー) + 所属チーム選択 + ログアウト
export default function AppShell({
  userId,
  displayName,
  team,
  children,
}: {
  userId: string;
  displayName: string;
  team: TeamId | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [myTeam, setMyTeam] = useState<TeamId | "">(team ?? "");

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const changeTeam = async (value: string) => {
    const next = (value || null) as TeamId | null;
    setMyTeam(next ?? "");
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ team: next })
      .eq("id", userId);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <h1 className="text-[15px] font-bold whitespace-nowrap">
            VRプロジェクト
          </h1>

          <nav className="ml-4 hidden gap-1 sm:flex">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium " +
                  (pathname === href
                    ? "bg-foreground/10"
                    : "text-ink-secondary hover:bg-foreground/5")
                }
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-32 truncate text-xs text-ink-muted md:block">
              {displayName}
            </span>
            <select
              value={myTeam}
              onChange={(e) => changeTeam(e.target.value)}
              className="max-w-32 rounded-lg border border-hairline bg-background px-2 py-1.5 text-xs"
              aria-label="所属チーム"
            >
              <option value="">チーム未設定</option>
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-ink-muted hover:bg-foreground/5"
              aria-label="ログアウト"
              title="ログアウト"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 sm:pb-8">
        {children}
      </main>

      {/* スマホ用下部ナビ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium " +
              (pathname === href ? "text-foreground" : "text-ink-muted")
            }
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
