import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.code || typeof body.code !== "string") {
      return Response.json({ error: "Code is required" }, { status: 400 });
    }

    const cleanCode = body.code.trim().toUpperCase();

    const { data, error } = await supabaseAdmin
      .from("teams")
      .select("id, name, code")
      .eq("code", cleanCode)
      .single();

    if (error || !data) {
      return Response.json({ error: "Invalid code" }, { status: 401 });
    }

    return Response.json({
      team_id: data.id,
      team_name: data.name,
      code: data.code,
    });
  } catch (error) {
    console.error("[team-login] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
