"use client";

import { format, parseISO } from "date-fns";
import type { Task } from "@/lib/types";
import { TEAMS } from "@/lib/types";
import DeviceIcon from "@/components/DeviceIcon";
import StatusBadge from "@/components/StatusBadge";

// 「一覧」タブ: 班ごとにタスクを時系列 (開始日順) で上から表示するログビュー。
// 行をタップすると編集モーダルが開く (ガントと同じ)。
export default function TaskListView({
  tasks,
  onTaskClick,
}: {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-4">
      {TEAMS.map((team) => {
        const items = tasks
          .filter((t) => t.team === team.id)
          .sort(
            (a, b) =>
              a.start_date.localeCompare(b.start_date) ||
              a.end_date.localeCompare(b.end_date)
          );
        return (
          <section
            key={team.id}
            className="overflow-hidden rounded-xl border border-hairline bg-surface"
          >
            <h3
              className="flex items-center gap-2 border-b border-hairline px-3 py-2 text-[13px] font-bold"
              style={{ boxShadow: `inset 3px 0 0 var(--team-${team.id})` }}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: `var(--team-${team.id})` }}
              />
              {team.label}
              <span className="ml-auto text-[11px] font-normal text-ink-muted">
                {items.length} 件
              </span>
            </h3>
            {items.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-ink-muted">
                タスクがありません
              </p>
            ) : (
              <ul>
                {items.map((task) => {
                  const active =
                    task.start_date <= today && today <= task.end_date;
                  return (
                    <li key={task.id} className="border-b border-hairline last:border-b-0">
                      <button
                        onClick={() => onTaskClick(task)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-foreground/[0.03]"
                      >
                        <span className="w-24 shrink-0 text-[11px] leading-tight text-ink-secondary tabular-nums">
                          {format(parseISO(task.start_date), "M/d")} –{" "}
                          {format(parseISO(task.end_date), "M/d")}
                          {active && (
                            <span
                              className="block text-[9px] font-bold"
                              style={{ color: `var(--team-${team.id})` }}
                            >
                              進行期間中
                            </span>
                          )}
                        </span>
                        <DeviceIcon
                          device={task.device}
                          size={16}
                          className="shrink-0 text-ink-secondary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {task.title}
                          </span>
                          {task.assignee && (
                            <span className="block truncate text-[11px] text-ink-muted">
                              {task.assignee}
                            </span>
                          )}
                        </span>
                        <StatusBadge status={task.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
