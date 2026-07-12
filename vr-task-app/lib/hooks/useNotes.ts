"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { NOTE_IMAGE_BUCKET } from "@/lib/types";

/**
 * 議事録・記録の取得 + Realtime 同期 + 画像アップロード付き追加。
 */
export function useNotes() {
  const supabase = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setError(error.message);
      else setNotes((data ?? []) as Note[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("notes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        (payload) => {
          setNotes((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string }).id;
              return prev.filter((n) => n.id !== oldId);
            }
            const next = payload.new as Note;
            const rest = prev.filter((n) => n.id !== next.id);
            return [next, ...rest].sort((a, b) =>
              b.created_at.localeCompare(a.created_at)
            );
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const addNote = useCallback(
    async (input: { title: string; body: string; image: File | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      let imagePath: string | null = null;
      if (input.image) {
        const ext = input.image.name.split(".").pop() || "jpg";
        imagePath = `${user?.id ?? "anon"}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(NOTE_IMAGE_BUCKET)
          .upload(imagePath, input.image, { contentType: input.image.type });
        if (uploadError) throw new Error(uploadError.message);
      }

      const authorName =
        (user?.user_metadata?.full_name as string | undefined) ||
        user?.email ||
        "";

      const { data, error } = await supabase
        .from("notes")
        .insert({
          title: input.title,
          body: input.body,
          image_path: imagePath,
          author_name: authorName,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      setNotes((prev) => [
        data as Note,
        ...prev.filter((n) => n.id !== data.id),
      ]);
    },
    [supabase]
  );

  const deleteNote = useCallback(
    async (note: Note) => {
      const { error } = await supabase.from("notes").delete().eq("id", note.id);
      if (error) throw new Error(error.message);
      if (note.image_path) {
        await supabase.storage.from(NOTE_IMAGE_BUCKET).remove([note.image_path]);
      }
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    },
    [supabase]
  );

  /** Storage のパスから公開 URL (サムネイル用) を得る */
  const imageUrl = useCallback(
    (path: string) =>
      supabase.storage.from(NOTE_IMAGE_BUCKET).getPublicUrl(path).data
        .publicUrl,
    [supabase]
  );

  return { notes, loading, error, addNote, deleteNote, imageUrl };
}
