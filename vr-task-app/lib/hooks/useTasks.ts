"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      a.start_date.localeCompare(b.start_date) ||
      a.created_at.localeCompare(b.created_at)
  );
}

export type TaskInput = Pick<
  Task,
  "title" | "team" | "device" | "assignee" | "start_date" | "end_date" | "status"
>;

/**
 * タスク一覧の取得 + Supabase Realtime による同期。
 * 他のメンバーが追加・変更したタスクも postgres_changes 経由で即時反映される。
 */
export function useTasks() {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("start_date");
      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else {
        setTasks(sortTasks((data ?? []) as Task[]));
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          setTasks((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string }).id;
              return prev.filter((t) => t.id !== oldId);
            }
            const next = payload.new as Task;
            const rest = prev.filter((t) => t.id !== next.id);
            return sortTasks([...rest, next]);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const addTask = useCallback(
    async (input: TaskInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, created_by: userData.user?.id ?? null })
        .select()
        .single();
      if (error) throw new Error(error.message);
      // Realtime でも届くが、自分の操作は即時反映する
      setTasks((prev) => sortTasks([...prev.filter((t) => t.id !== data.id), data as Task]));
      return data as Task;
    },
    [supabase]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<TaskInput>) => {
      // 楽観的更新: 先にローカルへ反映し、失敗したら元に戻す
      let before: Task[] = [];
      setTasks((prev) => {
        before = prev;
        return sortTasks(
          prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
        );
      });
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) {
        setTasks(before);
        throw new Error(error.message);
      }
    },
    [supabase]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      let before: Task[] = [];
      setTasks((prev) => {
        before = prev;
        return prev.filter((t) => t.id !== id);
      });
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        setTasks(before);
        throw new Error(error.message);
      }
    },
    [supabase]
  );

  return { tasks, loading, error, addTask, updateTask, deleteTask };
}
