"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useNotes } from "@/lib/hooks/useNotes";
import type { Note } from "@/lib/types";

export default function NotesPage({ userId }: { userId: string }) {
  const { notes, loading, error, addNote, deleteNote, imageUrl } = useNotes();
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState<Note | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">議事録・記録</h2>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          読み込みエラー: {error}
        </p>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-hairline bg-surface text-sm text-ink-muted">
          読み込み中…
        </div>
      ) : notes.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-hairline bg-surface text-sm text-ink-muted">
          記録がありません。右下の「＋」から追加してください。
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                onClick={() => setPreview(note)}
                className="flex w-full gap-3 rounded-xl border border-hairline bg-surface p-3 text-left transition hover:border-foreground/25"
              >
                {note.image_path ? (
                  // Supabase Storage の画像はドメインが動的なため next/image ではなく img を使用
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(note.image_path)}
                    alt=""
                    className="size-20 shrink-0 rounded-lg border border-hairline object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-ink-muted">
                    <ImagePlus size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{note.title}</div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-secondary">
                    {note.body}
                  </p>
                  <div className="mt-1.5 text-[11px] text-ink-muted">
                    {note.author_name} ·{" "}
                    {format(new Date(note.created_at), "yyyy/M/d HH:mm")}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setModalOpen(true)}
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition active:scale-95 sm:bottom-8"
        aria-label="記録を追加"
      >
        <Plus size={26} />
      </button>

      <NoteAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addNote}
      />

      {/* 記録の詳細表示 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-base font-bold">{preview.title}</h3>
              <button
                onClick={() => setPreview(null)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-foreground/5"
                aria-label="閉じる"
              >
                <X size={20} />
              </button>
            </div>
            {preview.image_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(preview.image_path)}
                alt=""
                className="mb-3 w-full rounded-xl border border-hairline"
              />
            )}
            <p className="text-sm whitespace-pre-wrap text-ink-secondary">
              {preview.body}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-ink-muted">
                {preview.author_name} ·{" "}
                {format(new Date(preview.created_at), "yyyy/M/d HH:mm")}
              </span>
              {preview.created_by === userId && (
                <button
                  onClick={async () => {
                    if (!confirm("この記録を削除しますか?")) return;
                    await deleteNote(preview);
                    setPreview(null);
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <Trash2 size={14} />
                  削除
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteAddModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: {
    title: string;
    body: string;
    image: File | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const pickImage = (file: File | null) => {
    setImage(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const reset = () => {
    setTitle("");
    setBody("");
    pickImage(null);
    setError(null);
    setSaving(false);
  };

  const submit = async () => {
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), body: body.trim(), image });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">記録を追加</h2>
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
              タイトル *
            </span>
            <input
              className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[15px] outline-none focus:border-foreground/40"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 7/12 定例ミーティング"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">
              内容
            </span>
            <textarea
              className="min-h-28 w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-[15px] outline-none focus:border-foreground/40"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="メモ・決定事項など"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-medium text-ink-secondary">
              画像 (会議メモ・資料の写真など)
            </span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-hairline bg-background px-3 py-4 text-sm text-ink-muted hover:border-foreground/30">
              <ImagePlus size={18} />
              {image ? image.name : "画像を選択 / 撮影"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
              />
            </label>
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt=""
                className="mt-2 max-h-48 rounded-lg border border-hairline object-contain"
              />
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
