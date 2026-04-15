import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { performing_team_id, voting_team_id, points_given } = body;

    if (
      !performing_team_id ||
      typeof performing_team_id !== "string" ||
      !voting_team_id ||
      typeof voting_team_id !== "string" ||
      typeof points_given !== "number"
    ) {
      return Response.json(
        { error: "Missing or invalid fields" },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(points_given) ||
      points_given < 1 ||
      points_given > 10
    ) {
      return Response.json(
        { error: "Points must be an integer between 1 and 10" },
        { status: 400 },
      );
    }

    if (voting_team_id === performing_team_id) {
      return Response.json(
        { error: "Cannot vote for your own team" },
        { status: 400 },
      );
    }

    const { data: gameState, error: gsError } = await supabaseAdmin
      .from("game_state")
      .select("phase, current_team_id")
      .eq("id", 1)
      .single();

    if (gsError) throw gsError;

    if (gameState.phase !== "voting_open") {
      return Response.json({ error: "Voting is not open" }, { status: 403 });
    }

    if (performing_team_id !== gameState.current_team_id) {
      return Response.json(
        { error: "This team is not currently on stage" },
        { status: 400 },
      );
    }

    const { data: voteData, error: voteError } = await supabaseAdmin
      .from("votes")
      .insert({
        performing_team_id,
        voting_team_id,
        points_given,
      })
      .select("id")
      .maybeSingle();

    if (voteError) {
      if (voteError.code === "23505") { // Unique violation
        // Usually happens if a team votes twice for the SAME performing team (or if schema constraint is wrong)
        return Response.json({ error: "You have already voted for this team" }, { status: 400 });
      }
      console.error("Vote Insert Error:", voteError);
      return Response.json({ error: "Database error inserting vote" }, { status: 500 });
    }

    const { data: votesObj, error: fetchVotesError } = await supabaseAdmin
      .from("votes")
      .select("points_given")
      .eq("performing_team_id", performing_team_id);

    if (fetchVotesError) throw fetchVotesError;

    const sum = votesObj.reduce((acc, curr) => acc + curr.points_given, 0);

    const { error: updateScoreError } = await supabaseAdmin
      .from("scores")
      .update({ audience_score: sum })
      .eq("team_id", performing_team_id);

    if (updateScoreError) throw updateScoreError;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[vote] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });

  }
}
