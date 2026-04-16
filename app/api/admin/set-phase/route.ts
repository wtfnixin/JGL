import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validPhases = ["waiting", "voting_open", "voting_closed", "results"];
    if (!body.phase || !validPhases.includes(body.phase)) {
      return Response.json({ error: "Invalid phase" }, { status: 400 });
    }

    if (body.phase === "voting_open") {
      const { data: gs } = await supabaseAdmin
        .from("game_state")
        .select("current_team_id")
        .eq("id", 1)
        .single();
        
      if (!gs?.current_team_id) {
        return Response.json(
          { error: "Cannot open voting: No team is currently on stage." },
          { status: 400 },
        );
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("game_state")
      .update({
        phase: body.phase,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updateError) throw updateError;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[set-phase] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
