"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import type { DayEvent, Task } from "@/lib/types";
import { TEAM_MAP } from "@/lib/types";
import DeviceIcon from "@/components/DeviceIcon";
import StatusBadge from "@/components/StatusBadge";

const DAY_W = 34; // 1日の幅(px)
const ROW_H = 56; // 1行の高さ(px)
const BAR_H = 34; // バーの高さ(px)
const HANDLE_W = 12; // リサイズハンドルの幅(px)
const EVENT_ROW_H = 88; // 全体予定行の高さ(px) — 縦書き全角6文字が収まる
const DRAG_THRESHOLD_PX = 5; // これ未満の移動はタップ(編集モーダル)扱い

type DragMode = "move" | "start" | "end";

interface DragState {
  id: string;
  mode: DragMode;
  originX: number;
  delta: number; // 日数
  moved: boolean;
}

function toDate(s: string): Date {
  return parseISO(s);
}

/**
 * 全体予定タイトルを縦積み表示用の行に分割する。
 * 全角1文字 = 1行、半角は2文字で1行 (縦書きの見た目を全ブラウザで再現するため)。
 */
function stackEventTitle(title: string): string[] {
  const lines: string[] = [];
  let buf = "";
  for (const ch of title) {
    if (/[ -~｡-ﾟ]/.test(ch)) {
      buf += ch;
      if (buf.length === 2) {
        lines.push(buf);
        buf = "";
      }
    } else {
      if (buf) {
        lines.push(buf);
        buf = "";
      }
      lines.push(ch);
    }
  }
  if (buf) lines.push(buf);
  return lines;
}

function fmt(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** ドラッグ中のプレビューを含めたバーの日付を返す */
function barDates(task: Task, drag: DragState | null): { start: Date; end: Date } {
  let start = toDate(task.start_date);
  let end = toDate(task.end_date);
  if (drag && drag.id === task.id && drag.delta !== 0) {
    if (drag.mode === "move") {
      start = addDays(start, drag.delta);
      end = addDays(end, drag.delta);
    } else if (drag.mode === "start") {
      start = addDays(start, drag.delta);
      if (start > end) start = end;
    } else {
      end = addDays(end, drag.delta);
      if (end < start) end = start;
    }
  }
  return { start, end };
}

export default function GanttChart({
  tasks,
  eventsByDate,
  onMoveTask,
  onTaskClick,
  onEventClick,
}: {
  tasks: Task[];
  /** 全体予定: "yyyy-MM-dd" → イベント */
  eventsByDate: Record<string, DayEvent>;
  onMoveTask: (id: string, start: string, end: string) => void;
  onTaskClick: (task: Task) => void;
  /** 全体予定行の日付セルをタップ (追加・編集) */
  onEventClick: (date: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // drag は描画用 state。ハンドラからは常に最新値が要るため ref にも同じ値を持つ
  // (ref の更新はイベントハンドラ内でのみ行う)
  const [drag, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const setDrag = (d: DragState | null) => {
    dragRef.current = d;
    setDragState(d);
  };

  const today = useMemo(() => toDate(format(new Date(), "yyyy-MM-dd")), []);

  // 表示する日付範囲: タスク全体 + 前後の余白 (最低でも今日の前2週間〜後6週間)
  const { rangeStart, days } = useMemo(() => {
    let min = addDays(today, -14);
    let max = addDays(today, 42);
    for (const t of tasks) {
      const s = toDate(t.start_date);
      const e = toDate(t.end_date);
      if (s < min) min = s;
      if (e > max) max = e;
    }
    const start = addDays(min, -3);
    const end = addDays(max, 7);
    const count = differenceInCalendarDays(end, start) + 1;
    return {
      rangeStart: start,
      days: Array.from({ length: count }, (_, i) => addDays(start, i)),
    };
  }, [tasks, today]);

  const daysW = days.length * DAY_W;
  const todayIdx = differenceInCalendarDays(today, rangeStart);

  // 月ヘッダー: 連続する同月の日をまとめる
  const months = useMemo(() => {
    const out: { label: string; count: number }[] = [];
    for (const d of days) {
      const label = format(d, "yyyy年M月", { locale: ja });
      const last = out[out.length - 1];
      if (last && last.label === label) last.count += 1;
      else out.push({ label, count: 1 });
    }
    return out;
  }, [days]);

  // 初回表示時に「今日」の少し手前までスクロール
  const scrolledOnce = useRef(false);
  useEffect(() => {
    if (scrolledOnce.current || !scrollerRef.current) return;
    scrolledOnce.current = true;
    scrollerRef.current.scrollLeft = Math.max(0, todayIdx * DAY_W - DAY_W * 2.5);
  }, [todayIdx]);

  const startDrag = (
    e: React.PointerEvent,
    task: Task,
    mode: DragMode
  ) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: task.id, mode, originX: e.clientX, delta: 0, moved: false });
  };

  const moveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.originX;
    const delta = Math.round(dx / DAY_W);
    const moved = d.moved || Math.abs(dx) > DRAG_THRESHOLD_PX;
    if (delta !== d.delta || moved !== d.moved) {
      setDrag({ ...d, delta, moved });
    }
  };

  const endDrag = (e: React.PointerEvent, task: Task) => {
    const d = dragRef.current;
    if (!d || d.id !== task.id) return;
    setDrag(null);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    if (!d.moved) {
      // タップ → 編集モーダルを開く
      onTaskClick(task);
      return;
    }
    const { start, end } = barDates(task, d);
    const newStart = fmt(start);
    const newEnd = fmt(end);
    if (newStart !== task.start_date || newEnd !== task.end_date) {
      onMoveTask(task.id, newStart, newEnd);
    }
  };

  return (
    <div
      ref={scrollerRef}
      className="overflow-auto overscroll-x-none rounded-xl border border-hairline bg-surface"
      style={{ maxHeight: "calc(100dvh - 220px)", minHeight: 240 }}
    >
      <div className="min-w-max">
        {/* ===== ヘッダー (月 + 日 + 全体予定) ===== */}
        <div className="sticky top-0 z-30 flex">
          <div className="sticky left-0 z-10 flex w-[132px] shrink-0 flex-col justify-between border-b border-r border-hairline bg-surface px-3 py-2 sm:w-[200px]">
            <span className="text-xs font-medium text-ink-muted">タスク</span>
            <span className="text-[11px] font-medium" style={{ color: "var(--event-red)" }}>
              全体予定
              <span className="block text-[9px] font-normal text-ink-muted">
                日付をタップで追加
              </span>
            </span>
          </div>
          <div className="shrink-0 border-b border-hairline bg-surface" style={{ width: daysW }}>
            <div className="flex h-6 border-b border-hairline">
              {months.map((m) => (
                <div
                  key={m.label}
                  className="truncate px-2 text-[11px] leading-6 font-medium text-ink-secondary"
                  style={{ width: m.count * DAY_W }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            <div className="flex h-8">
              {days.map((d, i) => {
                const dow = d.getDay();
                const isToday = i === todayIdx;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center"
                    style={{ width: DAY_W }}
                  >
                    <span
                      className={
                        "text-[11px] leading-none " +
                        (isToday
                          ? "flex size-4.5 items-center justify-center rounded-full bg-foreground font-bold text-background"
                          : dow === 0
                            ? "text-red-500"
                            : dow === 6
                              ? "text-blue-500"
                              : "text-ink-secondary")
                      }
                    >
                      {d.getDate()}
                    </span>
                    <span className="mt-0.5 text-[9px] leading-none text-ink-muted">
                      {format(d, "E", { locale: ja })}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* 全体予定行: 1日1件、赤字の縦書きで日付の真下に表示 */}
            <div className="flex border-t border-hairline" style={{ height: EVENT_ROW_H }}>
              {days.map((d, i) => {
                const dateStr = fmt(d);
                const ev = eventsByDate[dateStr];
                return (
                  <button
                    key={i}
                    onClick={() => onEventClick(dateStr)}
                    className="flex justify-center border-l border-hairline/60 pt-1 hover:bg-foreground/5"
                    style={{ width: DAY_W }}
                    aria-label={`${format(d, "M/d")} の全体予定${ev ? `: ${ev.title}` : "を追加"}`}
                  >
                    {ev && (
                      <span
                        className="inline-block overflow-hidden"
                        style={{
                          color: "var(--event-red)",
                          maxHeight: EVENT_ROW_H - 8,
                        }}
                      >
                        {stackEventTitle(ev.title).map((line, li) => (
                          <span
                            key={li}
                            className="block text-center text-[12px] font-bold leading-[13px]"
                          >
                            {line}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== ボディ ===== */}
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            タスクがありません。右下の「＋」から追加してください。
          </div>
        ) : (
          <div className="flex">
            {/* 左: タスク情報列 (横スクロールしても固定) */}
            <div className="sticky left-0 z-20 w-[132px] shrink-0 border-r border-hairline bg-surface sm:w-[200px]">
              {tasks.map((task) => {
                const team = TEAM_MAP[task.team];
                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="block w-full border-b border-hairline px-3 py-2 text-left"
                    style={{
                      height: ROW_H,
                      boxShadow: `inset 3px 0 0 var(--team-${team.id})`,
                    }}
                  >
                    <div className="truncate text-[13px] font-medium leading-tight">
                      {task.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                      <StatusBadge status={task.status} />
                      {task.assignee && (
                        <span className="truncate text-[11px] text-ink-muted">
                          {task.assignee}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 右: タイムライン */}
            <div className="relative shrink-0" style={{ width: daysW }}>
              {/* 背景: 日グリッド / 週末 / 今日 */}
              <div className="absolute inset-0">
                {days.map((d, i) => {
                  const dow = d.getDay();
                  const weekend = dow === 0 || dow === 6;
                  return (
                    <div
                      key={i}
                      className={
                        "absolute inset-y-0 border-l border-hairline/60 " +
                        (weekend ? "bg-foreground/[0.035]" : "")
                      }
                      style={{ left: i * DAY_W, width: DAY_W }}
                    />
                  );
                })}
                {todayIdx >= 0 && todayIdx < days.length && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/40"
                    style={{ left: todayIdx * DAY_W + DAY_W / 2 }}
                  />
                )}
              </div>

              {/* タスクバー */}
              {tasks.map((task) => {
                const team = TEAM_MAP[task.team];
                const { start, end } = barDates(task, drag);
                const x = differenceInCalendarDays(start, rangeStart) * DAY_W;
                const w =
                  (differenceInCalendarDays(end, start) + 1) * DAY_W;
                const dragging = drag?.id === task.id && drag.moved;
                const showLabel = w >= 64;

                return (
                  <div
                    key={task.id}
                    className="relative border-b border-hairline"
                    style={{ height: ROW_H }}
                  >
                    <div
                      className={
                        "absolute flex items-center rounded-md select-none " +
                        (dragging
                          ? "z-10 shadow-lg ring-2 ring-foreground/30"
                          : "cursor-grab")
                      }
                      style={{
                        left: x + 2,
                        width: w - 4,
                        height: BAR_H,
                        top: (ROW_H - BAR_H) / 2,
                        background: `var(--team-${team.id})`,
                        color: `var(--team-ink-${team.id})`,
                        opacity: task.status === "done" ? 0.55 : 1,
                        touchAction: "none",
                      }}
                      onPointerDown={(e) => startDrag(e, task, "move")}
                      onPointerMove={moveDrag}
                      onPointerUp={(e) => endDrag(e, task)}
                      onPointerCancel={() => setDrag(null)}
                    >
                      {/* 開始日リサイズハンドル */}
                      <div
                        className="absolute inset-y-0 left-0 cursor-ew-resize rounded-l-md"
                        style={{ width: HANDLE_W, touchAction: "none" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          startDrag(e, task, "start");
                        }}
                        onPointerMove={moveDrag}
                        onPointerUp={(e) => endDrag(e, task)}
                      />
                      <div className="pointer-events-none flex min-w-0 items-center gap-1.5 px-2.5">
                        <DeviceIcon device={task.device} size={15} className="shrink-0" />
                        {showLabel && (
                          <span className="truncate text-xs font-medium">
                            {task.title}
                          </span>
                        )}
                      </div>
                      {/* 終了日リサイズハンドル */}
                      <div
                        className="absolute inset-y-0 right-0 cursor-ew-resize rounded-r-md"
                        style={{ width: HANDLE_W, touchAction: "none" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          startDrag(e, task, "end");
                        }}
                        onPointerMove={moveDrag}
                        onPointerUp={(e) => endDrag(e, task)}
                      />
                    </div>
                    {/* ドラッグ中は日付をツールチップ表示 */}
                    {dragging && (
                      <div
                        className="absolute z-20 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background"
                        style={{ left: x + 2, top: 0 }}
                      >
                        {format(start, "M/d")} – {format(end, "M/d")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
