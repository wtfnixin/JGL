import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    if (!isAdmin(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const team_id = searchParams.get("team_id");

    if (!team_id) {
      return Response.json({ error: "team_id required" }, { status: 400 });
    }

    const { data: votes, error } = await supabaseAdmin
      .from("votes")
      .select("*")
      .eq("performing_team_id", team_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({ votes });
  } catch (error) {
    console.error("[live-votes] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
