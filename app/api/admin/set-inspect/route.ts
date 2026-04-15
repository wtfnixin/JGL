import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inspect_mode } = await req.json().catch(() => ({}));

    // Update the game_state table (id 1)
    const { error: updateError } = await supabaseAdmin
      .from("game_state")
      .update({
        inspect_mode: !!inspect_mode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updateError) throw updateError;

    return Response.json({ ok: true, inspect_mode });
  } catch (error: any) {
    console.error("[set-inspect] error:", error);
    return Response.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
