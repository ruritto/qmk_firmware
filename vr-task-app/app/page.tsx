import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import GanttPage from "./GanttPage";
import type { Profile } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const displayName =
    profile?.display_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    "";

  return (
    <AppShell
      userId={user.id}
      displayName={displayName}
      team={profile?.team ?? null}
    >
      <GanttPage myTeam={profile?.team ?? null} />
    </AppShell>
  );
}
