"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import GanttChart from "@/components/gantt/GanttChart";
import EventModal from "@/components/gantt/EventModal";
import TaskListView from "@/components/TaskListView";
import TeamTabs from "@/components/TeamTabs";
import type { DayEvent, TabId, Task } from "@/lib/types";

const d = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");

const base = {
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SAMPLE: Task[] = [
  { id: "1", title: "昇降機構プロトタイプ", team: "climb", device: "climb", assignee: "田中", start_date: d(-5), end_date: d(3), status: "in_progress", ...base },
  { id: "2", title: "ハーネス調整", team: "climb", device: "climb", assignee: "佐藤", start_date: d(2), end_date: d(9), status: "todo", ...base },
  { id: "3", title: "車輪トルク計測", team: "wheelchair", device: "wheelchair", assignee: "鈴木", start_date: d(-8), end_date: d(-2), status: "done", ...base },
  { id: "4", title: "座面センサー実装", team: "wheelchair", device: "wheelchair", assignee: "高橋", start_date: d(0), end_date: d(12), status: "in_progress", ...base },
  { id: "5", title: "リール振動デバイス", team: "fishing_bike", device: "fishing", assignee: "伊藤", start_date: d(-3), end_date: d(6), status: "in_progress", ...base },
  { id: "6", title: "ペダル負荷制御", team: "fishing_bike", device: "bike", assignee: "渡辺", start_date: d(7), end_date: d(20), status: "todo", ...base },
];

const SAMPLE_EVENTS: DayEvent[] = [
  { id: "e1", date: d(2), title: "中間発表", created_by: null, created_at: "" },
  { id: "e2", date: d(9), title: "全体MTG", created_by: null, created_at: "" },
  { id: "e3", date: d(16), title: "デモ審査会", created_by: null, created_at: "" },
];

export default function DevGanttPreview() {
  const [tab, setTab] = useState<TabId>("all");
  const [tasks, setTasks] = useState<Task[]>(SAMPLE);
  const [events, setEvents] = useState<DayEvent[]>(SAMPLE_EVENTS);
  const [eventDate, setEventDate] = useState<string | null>(null);

  const visible =
    tab === "all" || tab === "list"
      ? tasks
      : tasks.filter((t) => t.team === tab);

  const eventsByDate = Object.fromEntries(events.map((e) => [e.date, e]));

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-4">
      <h1 className="text-base font-bold">ガントチャート プレビュー (開発用)</h1>
      <TeamTabs active={tab} onChange={setTab} />
      {tab === "list" ? (
        <TaskListView
          tasks={visible}
          onTaskClick={(task) => alert(`タップ: ${task.title}`)}
        />
      ) : (
        <GanttChart
          tasks={visible}
          eventsByDate={eventsByDate}
          onMoveTask={(id, start_date, end_date) =>
            setTasks((prev) =>
              prev.map((t) => (t.id === id ? { ...t, start_date, end_date } : t))
            )
          }
          onTaskClick={(task) => alert(`タップ: ${task.title}`)}
          onEventClick={setEventDate}
        />
      )}
      {eventDate && (
        <EventModal
          key={eventDate}
          date={eventDate}
          event={eventsByDate[eventDate] ?? null}
          onClose={() => setEventDate(null)}
          onSave={async (date, title) =>
            setEvents((prev) => [
              ...prev.filter((e) => e.date !== date),
              { id: date, date, title, created_by: null, created_at: "" },
            ])
          }
          onDelete={async (id) =>
            setEvents((prev) => prev.filter((e) => e.id !== id))
          }
        />
      )}
    </div>
  );
}
