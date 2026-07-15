import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserLeague } from "@/lib/types";
import AssistantChat from "./AssistantChat";

export default async function AssistantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: leagues } = await supabase
    .from("user_leagues")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold">Draft Assistant</h1>
      <AssistantChat leagues={(leagues as UserLeague[] | null) ?? []} />
    </div>
  );
}
