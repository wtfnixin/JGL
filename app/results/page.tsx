'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

export default function Results() {
  const [teams, setTeams] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  
  useEffect(() => {
    const loadInitialData = async () => {
      const { data: tData } = await supabase.from('teams').select('*');
      if (tData) setTeams(tData);

      const { data: sData } = await supabase.from('scores').select('*').order('total_score', { ascending: false });
      if (sData) setScores(sData);
    };

    loadInitialData();

    // FAILSAFE POLLING: Ensure the big-screen projector updates every 2 seconds if WebSockets drop
    const pollInterval = setInterval(() => {
      loadInitialData();
    }, 2000);

    const channel = supabase.channel('results-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, async () => {
        const { data: sData } = await supabase.from('scores').select('*').order('total_score', { ascending: false });
        if (sData) setScores(sData);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, async () => {
         const { data: tData } = await supabase.from('teams').select('*');
         if (tData) setTeams(tData);
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-[#ededed] font-mono p-8 selection:bg-[#00FF41] selection:text-black flex flex-col justify-center items-center">
      <div className="w-full max-w-6xl">
        <header className="mb-16 text-center border-b-4 border-[#333] pb-8">
           <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter text-[#00FF41]">Global Results</h1>
           <p className="text-[#666] text-xl tracking-[0.5em] mt-4 uppercase">Jain's Got Latent — Live Leaderboard</p>
        </header>

        <div className="flex flex-col gap-6 w-full">
          {scores.map((score, index) => {
            const team = teams.find(t => t.id === score.team_id);
            if (!team) return null;
            
            // The top 3 get special highlighting
            const isTop3 = index < 3;
            let borderStyle = "border-[#333]";
            let textStyle = "text-[#ededed]";
            let scoreStyle = "text-[#00FF41]";
            
            if (index === 0) {
              borderStyle = "border-yellow-500 bg-yellow-500/10";
              textStyle = "text-yellow-500";
              scoreStyle = "text-yellow-500";
            } else if (index === 1) {
              borderStyle = "border-[#cfcfcf]";
            } else if (index === 2) {
              borderStyle = "border-[#cd7f32]";
            }

            return (
              <div key={score.id} className={`border-4 p-8 flex justify-between items-center transition-all ${borderStyle} bg-black`}>
                 <div className="flex items-center gap-8 md:gap-16">
                    <span className="text-[#666] font-bold text-4xl w-12 text-right">
                      #{index + 1}
                    </span>
                    <span className={`font-bold text-4xl md:text-6xl tracking-wider uppercase truncate ${textStyle}`}>
                      {team.name}
                    </span>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className={`font-bold text-6xl md:text-8xl tracking-tighter ${scoreStyle}`}>
                      {score.total_score}
                    </span>
                    <span className="text-[#444] text-xl uppercase tracking-[0.2em] mt-2">Points</span>
                 </div>
              </div>
            );
          })}

          {scores.length === 0 && (
            <div className="text-[#444] text-2xl border-4 border-[#333] p-16 text-center tracking-widest uppercase">
               SYSTEM STANDBY — NO AUDIENCE DATA ACCUMULATED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
