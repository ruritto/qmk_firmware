"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import GanttChart from "@/components/gantt/GanttChart";
import TaskModal from "@/components/gantt/TaskModal";
import TeamTabs from "@/components/TeamTabs";
import { useTasks, type TaskInput } from "@/lib/hooks/useTasks";
import type { TabId, Task, TeamId } from "@/lib/types";

export default function GanttPage({ myTeam }: { myTeam: TeamId | null }) {
  // デフォルト表示はログインユーザーの所属チーム (未設定なら全体)
  const [tab, setTab] = useState<TabId>(myTeam ?? "all");
  const { tasks, loading, error, addTask, updateTask, deleteTask } = useTasks();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const visibleTasks = useMemo(
    () => (tab === "all" ? tasks : tasks.filter((t) => t.team === tab)),
    [tasks, tab]
  );

  const openAdd = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const save = async (input: TaskInput) => {
    if (editingTask) {
      await updateTask(editingTask.id, input);
    } else {
      await addTask(input);
    }
  };

  const moveTask = (id: string, start_date: string, end_date: string) => {
    updateTask(id, { start_date, end_date }).catch(() => {
      // 失敗時は useTasks 側でロールバック済み
    });
  };

  // 新規追加時のデフォルトチーム: チームタブ表示中はそのチーム
  const defaultTeam: TeamId =
    tab !== "all" ? tab : (myTeam ?? "climb");

  return (
    <div className="space-y-3">
      <TeamTabs active={tab} onChange={setTab} />

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          読み込みエラー: {error}
        </p>
      )}

      {loading ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-hairline bg-surface text-sm text-ink-muted">
          読み込み中…
        </div>
      ) : (
        <GanttChart
          tasks={visibleTasks}
          onMoveTask={moveTask}
          onTaskClick={openEdit}
        />
      )}

      <p className="text-[11px] text-ink-muted">
        バーをドラッグで日程移動、両端をドラッグで期間変更、タップで編集できます。
      </p>

      {/* タスク追加 FAB */}
      <button
        onClick={openAdd}
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition active:scale-95 sm:bottom-8"
        aria-label="タスクを追加"
      >
        <Plus size={26} />
      </button>

      {modalOpen && (
        <TaskModal
          key={editingTask?.id ?? "new"}
          task={editingTask}
          defaultTeam={defaultTeam}
          onClose={() => setModalOpen(false)}
          onSave={save}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}
