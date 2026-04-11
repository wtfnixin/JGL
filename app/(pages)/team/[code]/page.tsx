'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

export default function Team({ params }: { params: { code: string } }) {
  const [gameState, setGameState] = useState<any>({});
  const [scores, setScores] = useState<any[]>([]);
  const [teamInfo, setTeamInfo] = useState<any>(null);

  useEffect(() => {
    const info = localStorage.getItem('jgl_team');
    if (info) setTeamInfo(JSON.parse(info));

    const fetchAll = async () => {
      const gRes = await fetch('/api/game-state');
      if (gRes.ok) setGameState(await gRes.json());
      const sRes = await fetch('/api/scores');
      if (sRes.ok) setScores(await sRes.json());
    };

    fetchAll();

    const channel = supabase
      .channel('jgl-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, (payload) => {
        setGameState(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'scores' }, (payload) => {
        setScores((prev) => prev.map(s => s.id === payload.new.team_id ? { ...s, ...payload.new } : s));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchAll();
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVote = async () => {
    const points = parseInt(prompt("Enter points to give (1-10):") || "0");
    if (points < 1 || points > 10) {
      alert("Invalid points. Must be between 1 and 10.");
      return;
    }
    const res = await fetch('/api/vote', {
      method: "POST",
      body: JSON.stringify({
        performing_team_id: gameState.current_team_id,
        voting_team_id: teamInfo?.team_id,
        points_given: points
      })
    });
    
    if (res.ok) alert("Vote submitted successfully!");
    else alert("Failed to vote. You may have already voted or the input was invalid.");
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6 md:p-12 text-white font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Block  */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6 gap-4">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            {teamInfo?.team_name || 'Loading Team...'}
          </h1>
          <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl font-mono text-lg text-gray-300 w-max shadow-inner">
            {teamInfo?.code || params.code}
          </div>
        </div>

        {/* Action / Voting Block */}
        {gameState?.phase === 'voting_open' && gameState?.current_team_id !== teamInfo?.team_id && (
          <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 border border-blue-500/30 p-8 rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.15)] text-center space-y-6">
            <h2 className="text-3xl font-black text-blue-100">Voting is Open!</h2>
            <p className="text-blue-200 text-lg">Rate the team currently on stage (Team ID: {gameState.current_team_id})</p>
            <button 
              onClick={handleVote} 
              className="w-full md:w-auto px-12 py-5 bg-blue-500 hover:bg-blue-400 text-white font-black text-xl rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all transform hover:-translate-y-1"
            >
              CAST VOTE
            </button>
          </div>
        )}

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-2">Current Phase</h3>
            <div className="text-2xl font-bold capitalize text-white">
              {gameState?.phase ? gameState.phase.replace('_', ' ') : 'Loading...'}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
             <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-2">Stage Status</h3>
             {gameState?.current_team_id ? (
                <div className="text-xl font-medium text-white">Team ID <span className="font-bold text-2xl text-emerald-400">{gameState.current_team_id}</span> is performing</div>
             ) : (
                <div className="text-xl font-medium text-gray-500">Stage is empty</div>
             )}
          </div>
        </div>

        {/* Live Scoreboard */}
        {gameState?.phase === 'results' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6 mt-8">
            <h2 className="text-2xl font-black border-b border-gray-800 pb-4 text-emerald-400 tracking-wide">Final Results</h2>
            <div className="space-y-4">
              {scores.sort((a,b) => (b.audience_score + b.bonus_score) - (a.audience_score + a.bonus_score)).map((score, index) => (
                <div key={score.id} className="flex justify-between items-center bg-gray-950 border border-gray-800 p-5 rounded-xl">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 font-black text-xl w-6">{index + 1}.</span>
                    <span className="font-bold text-xl text-gray-100">Team {score.team_id}</span>
                  </div>
                  <div className="text-emerald-400 font-black text-3xl">
                    {score.audience_score + score.bonus_score} <span className="text-base font-medium text-gray-500 uppercase tracking-widest">pts</span>
                  </div>
                </div>
              ))}
              {scores.length === 0 && <div className="text-gray-500 italic p-4 text-center">No scores computed yet.</div>}
            </div>
          </div>
        )}

        {/* Debug Raw Data (Hidden mostly, but keeping for dev) */}
        {!['voting_open', 'results'].includes(gameState?.phase) && (
            <div className="text-center opacity-50 pt-12">
               Waiting for the next session to begin...
            </div>
        )}
      </div>
    </div>
  );
}
