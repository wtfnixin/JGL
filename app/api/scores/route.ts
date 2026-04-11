import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: scores, error } = await supabaseAdmin
      .from("scores")
      .select(
        `
        audience_score,
        total_score,
        bonus_awarded,
        bonus_label,
        guess_submitted,
        guess_value,
        teams!inner(id, name, code)
      `,
      )
      .order("total_score", { ascending: false });

    if (error) throw error;

    const formattedData = scores.map((s: any) => ({
      id: s.teams.id,
      name: s.teams.name,
      code: s.teams.code,
      audience_score: s.audience_score,
      total_score: s.total_score,
      bonus_awarded: s.bonus_awarded,
      bonus_label: s.bonus_label,
      guess_submitted: s.guess_submitted,
      guess_value: s.guess_value,
    }));

    return Response.json(formattedData);
  } catch (error) {
    console.error("[scores] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
