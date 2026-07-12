"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Trash2, X } from "lucide-react";
import type { Task, TeamId } from "@/lib/types";
import { DEVICES, STATUSES, TEAMS, TEAM_MAP } from "@/lib/types";
import type { TaskInput } from "@/lib/hooks/useTasks";

const inputCls =
  "w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[15px] outline-none focus:border-foreground/40";

// 開くたびに親側で key を変えてマウントし直す前提 (フォーム初期値は初回マウント時に確定)
export default function TaskModal({
  task,
  defaultTeam,
  onClose,
  onSave,
  onDelete,
}: {
  /** null = 新規作成 / Task = 編集 */
  task: Task | null;
  defaultTeam: TeamId;
  onClose: () => void;
  onSave: (input: TaskInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState<TaskInput>(() =>
    task
      ? {
          title: task.title,
          team: task.team,
          device: task.device,
          assignee: task.assignee,
          start_date: task.start_date,
          end_date: task.end_date,
          status: task.status,
        }
      : emptyForm(defaultTeam)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setTeam = (team: TeamId) => {
    const devices = TEAM_MAP[team].devices;
    setForm((f) => ({
      ...f,
      team,
      // チームの扱わないデバイスが選ばれていたら先頭のデバイスに直す
      device: devices.includes(f.device) ? f.device : devices[0],
    }));
  };

  const submit = async () => {
    if (!form.title.trim()) {
      setError("タスク名を入力してください");
      return;
    }
    if (form.end_date < form.start_date) {
      setError("終了日は開始日以降にしてください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form, title: form.title.trim() });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!task) return;
    if (!confirm(`「${task.title}」を削除しますか?`)) return;
    setSaving(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
      setSaving(false);
    }
  };

  const teamDevices = TEAM_MAP[form.team].devices;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">
            {task ? "タスクを編集" : "タスクを追加"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-muted hover:bg-foreground/5"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">
              タスク名 *
            </span>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="例: 昇降機構のプロトタイプ作成"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-medium text-ink-secondary">
              チーム
            </span>
            <div className="grid grid-cols-3 gap-2">
              {TEAMS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTeam(t.id)}
                  className={
                    "rounded-lg border px-2 py-2 text-xs font-medium transition " +
                    (form.team === t.id
                      ? "border-transparent"
                      : "border-hairline bg-background text-ink-secondary")
                  }
                  style={
                    form.team === t.id
                      ? {
                          background: `var(--team-${t.id})`,
                          color: `var(--team-ink-${t.id})`,
                        }
                      : undefined
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">
              デバイス種別
            </span>
            <select
              className={inputCls}
              value={form.device}
              onChange={(e) => set("device", e.target.value as TaskInput["device"])}
            >
              {DEVICES.filter((d) => teamDevices.includes(d.id)).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">
              担当者
            </span>
            <input
              className={inputCls}
              value={form.assignee}
              onChange={(e) => set("assignee", e.target.value)}
              placeholder="例: 田中"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-secondary">
                開始日
              </span>
              <input
                type="date"
                className={inputCls}
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-secondary">
                終了日
              </span>
              <input
                type="date"
                className={inputCls}
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">
              進捗ステータス
            </span>
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) => set("status", e.target.value as TaskInput["status"])}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            {task && (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
              >
                <Trash2 size={16} />
                削除
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {task ? "保存" : "追加"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function emptyForm(team: TeamId): TaskInput {
  const today = format(new Date(), "yyyy-MM-dd");
  return {
    title: "",
    team,
    device: TEAM_MAP[team].devices[0],
    assignee: "",
    start_date: today,
    end_date: today,
    status: "todo",
  };
}
