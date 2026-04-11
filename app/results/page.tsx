'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';

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
        <header className="mb-12 text-center border-b-2 border-[#333] pb-6">
           <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter text-[#00FF41]">Global Results</h1>
           <p className="text-[#666] text-sm tracking-[0.3em] mt-3 uppercase">Jain's Got Latent — Live Leaderboard</p>
        </header>

        <div className="flex flex-col gap-6 w-full overflow-hidden p-2">
          <AnimatePresence mode="popLayout">
            {scores.map((score, index) => {
              const team = teams.find(t => t.id === score.team_id);
              if (!team) return null;
              
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
                <motion.div 
                  key={score.team_id} 
                  layout
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25, duration: 0.5 }}
                  className={`border-2 p-6 flex justify-between items-center transition-colors ${borderStyle} bg-black`}
                >
                   <div className="flex items-center gap-6 md:gap-8 min-w-0">
                      <span className="text-[#666] font-bold text-2xl w-10 text-right flex-shrink-0">
                        #{index + 1}
                      </span>
                      <span className={`font-bold text-2xl md:text-4xl tracking-wider uppercase truncate ${textStyle}`}>
                        {team.name}
                      </span>
                   </div>
                   <div className="flex flex-col items-end flex-shrink-0">
                      <motion.span 
                        key={score.total_score}
                        initial={{ scale: 1.5, color: '#fff' }}
                        animate={{ scale: 1, color: index === 0 ? '#eab308' : '#00FF41' }}
                        transition={{ duration: 0.4 }}
                        className={`font-bold text-4xl md:text-5xl tracking-tighter ${scoreStyle}`}
                      >
                        {score.total_score}
                      </motion.span>
                      <span className="text-[#444] text-sm uppercase tracking-[0.2em] mt-1">Points</span>
                   </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

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
