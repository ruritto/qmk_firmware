"use client";

import type { TabId } from "@/lib/types";
import { TABS } from "@/lib/types";

// 「全体 / クライム / 車椅子 / 釣り・自転車」の表示切り替えタブ
export default function TeamTabs({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div
      className="grid grid-cols-4 gap-1 rounded-xl border border-hairline bg-surface p-1"
      role="tablist"
    >
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={
              "flex items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 py-1.5 text-[11px] font-medium transition sm:gap-1.5 sm:text-[13px] " +
              (selected
                ? "bg-foreground text-background"
                : "text-ink-secondary hover:bg-foreground/5")
            }
          >
            {tab.id !== "all" && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: `var(--team-${tab.id})` }}
              />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
