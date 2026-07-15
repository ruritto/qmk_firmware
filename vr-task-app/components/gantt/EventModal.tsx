"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Loader2, Trash2, X } from "lucide-react";
import type { DayEvent } from "@/lib/types";
import { EVENT_TITLE_MAX_WIDTH, eventTitleWidth } from "@/lib/types";

// 全体予定の追加・編集モーダル (1日1件、全角6文字/半角12文字まで)
export default function EventModal({
  date,
  event,
  onClose,
  onSave,
  onDelete,
}: {
  date: string; // "yyyy-MM-dd"
  event: DayEvent | null; // null = 新規
  onClose: () => void;
  onSave: (date: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const width = eventTitleWidth(title);
  const over = width > EVENT_TITLE_MAX_WIDTH;

  const submit = async () => {
    const t = title.trim();
    if (!t) {
      setError("予定を入力してください");
      return;
    }
    if (eventTitleWidth(t) > EVENT_TITLE_MAX_WIDTH) {
      setError("全角6文字 (半角12文字) 以内で入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(date, t);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!event) return;
    setSaving(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-sm sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">
            {format(parseISO(date), "M月d日 (E)", { locale: ja })} の全体予定
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-muted hover:bg-foreground/5"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-ink-secondary">
            予定 (ガント上部に赤字で表示)
            <span className={over ? "font-bold text-red-600" : "text-ink-muted"}>
              {Math.ceil(width / 2)} / 6 文字
            </span>
          </span>
          <input
            className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[15px] outline-none focus:border-foreground/40"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 中間発表"
            autoFocus
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          {event && (
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
            disabled={saving || over}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
