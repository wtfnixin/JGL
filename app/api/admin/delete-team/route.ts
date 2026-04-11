import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.team_id || typeof body.team_id !== "string") {
      return Response.json({ error: "team_id is required" }, { status: 400 });
    }

    // Because ON DELETE CASCADE is set on scores and votes, and ON DELETE SET NULL on game_state,
    // this single deletion safely clears all records related to the team from the entire database.
    const { error: deleteError } = await supabaseAdmin
      .from("teams")
      .delete()
      .eq("id", body.team_id);

    if (deleteError) throw deleteError;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[delete-team] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
