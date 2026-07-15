"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createLeague(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rosterSlots = {
    QB: Number(formData.get("qb")),
    RB: Number(formData.get("rb")),
    WR: Number(formData.get("wr")),
    TE: Number(formData.get("te")),
    FLEX: Number(formData.get("flex")),
    BENCH: Number(formData.get("bench")),
  };

  const { error } = await supabase.from("user_leagues").insert({
    user_id: user.id,
    name: String(formData.get("name") || "My League"),
    league_type: String(formData.get("league_type")),
    scoring: String(formData.get("scoring")),
    team_count: Number(formData.get("team_count")),
    draft_position: Number(formData.get("draft_position")),
    roster_slots: rosterSlots,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/leagues");
}

export async function deleteLeague(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("user_leagues").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/leagues");
}
