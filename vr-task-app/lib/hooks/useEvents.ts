"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DayEvent } from "@/lib/types";

/**
 * 全体予定 (1日1件の短いイベント) の取得 + Realtime 同期。
 */
export function useEvents() {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<DayEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase.from("events").select("*");
      if (!cancelled && data) setEvents(data as DayEvent[]);
    };
    load();

    const channel = supabase
      .channel("events-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        (payload) => {
          setEvents((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string }).id;
              return prev.filter((e) => e.id !== oldId);
            }
            const next = payload.new as DayEvent;
            return [...prev.filter((e) => e.id !== next.id), next];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  /** 同じ日付があれば上書き (1日1件) */
  const saveEvent = useCallback(
    async (date: string, title: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("events")
        .upsert(
          { date, title, created_by: userData.user?.id ?? null },
          { onConflict: "date" }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      setEvents((prev) => [
        ...prev.filter((e) => e.date !== date),
        data as DayEvent,
      ]);
    },
    [supabase]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [supabase]
  );

  /** date ("yyyy-MM-dd") → イベント の索引 */
  const eventsByDate = useMemo(() => {
    const map: Record<string, DayEvent> = {};
    for (const e of events) map[e.date] = e;
    return map;
  }, [events]);

  return { events, eventsByDate, saveEvent, deleteEvent };
}
