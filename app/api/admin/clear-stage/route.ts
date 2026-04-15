import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("game_state")
      .update({
        current_team_id: null,
        phase: "waiting",
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updateError) throw updateError;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[clear-stage] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
