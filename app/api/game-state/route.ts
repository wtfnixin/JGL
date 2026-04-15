import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("game_state")
      .select("*, teams ( name, code )")
      .eq("id", 1)
      .single();

    if (error) throw error;

    return Response.json({
      phase: data.phase,
      current_team_id: data.current_team_id,
      updated_at: data.updated_at,
      inspect_mode: !!data.inspect_mode,
      current_team_name: data.teams ? (data.teams as any).name : null,
      current_team_code: data.teams ? (data.teams as any).code : null,
    });
  } catch (error) {
    console.error("[game-state] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
