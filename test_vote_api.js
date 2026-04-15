require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
    try {
        const performing_team_id = 'ade9b452-7996-4ff1-9aa9-5c012158b489';

        // 1. Fetch votes
        const { data: votesObj, error: fetchVotesError } = await supabaseAdmin
          .from("votes")
          .select("points_given")
          .eq("performing_team_id", performing_team_id);

        if (fetchVotesError) throw fetchVotesError;
        const sum = votesObj.reduce((acc, curr) => acc + curr.points_given, 0);
        console.log("Sum:", sum);

        // 2. Count teams
        const { count: totalTeams, error: countError } = await supabaseAdmin
          .from("teams")
          .select("*", { count: "exact", head: true });
          
        if (countError) throw countError;
        console.log("Total Teams:", totalTeams);
        
        const eligibleVoters = Math.max(1, (totalTeams || 1) - 1);
        const average = parseFloat((sum / eligibleVoters).toFixed(2));
        console.log("Average:", average);

        // 3. Update scores
        const { error: updateScoreError } = await supabaseAdmin
          .from("scores")
          .update({ audience_score: average })
          .eq("team_id", performing_team_id);

        if (updateScoreError) throw updateScoreError;
        console.log("Success");
    } catch (e) {
        console.error("CAUGHT ERROR:", e);
    }
})();
