"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { motion, AnimatePresence } from "framer-motion";

export default function Team({ params }: { params: { code: string } }) {
  const [gameState, setGameState] = useState<any>({});
  const [scores, setScores] = useState<any[]>([]);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votePoints, setVotePoints] = useState<number | "">("");
  const [voteError, setVoteError] = useState("");
  const [votedTeamId, setVotedTeamId] = useState("");
  const [tabId] = useState(() => typeof window !== 'undefined' ? Math.random().toString(36).substring(2, 10) : "");

  useEffect(() => {
    let infoParsed: any = null;
    const info = sessionStorage.getItem("jgl_team");
    if (info) {
      infoParsed = JSON.parse(info);
      setTeamInfo(infoParsed);
    } else {
      window.location.href = "/login";
      return;
    }

    const fetchAll = async () => {
      const gRes = await fetch(`/api/game-state?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (gRes.ok) setGameState(await gRes.json());
      const sRes = await fetch(`/api/scores?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (sRes.ok) setScores(await sRes.json());
    };

    fetchAll();

    // FAILSAFE POLLING: Bypasses the need for Supabase Realtime toggles by manually pulling data every 2s
    const pollInterval = setInterval(() => {
      fetchAll();
    }, 2000);

    const channel = supabase
      .channel("jgl-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state" },
        () => {
          fetchAll();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scores" },
        () => {
          fetchAll();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") fetchAll();
      });

    // -------------------------------------------------------------
    // STRICT DEVICE / TAB PRESENCE LOCK 
    // -------------------------------------------------------------
    // 1. Same-Browser Tab Lock (Instant Local Kick)
    const bc = new BroadcastChannel(`jgl_team_${infoParsed.code}`);
    bc.onmessage = (e) => {
       if (e.data.type === 'PING') {
          // If we are actively established, reply to the newly opened tab
          bc.postMessage({ type: 'PONG', survivorId: tabId });
       }
       if (e.data.type === 'PONG') {
          if (e.data.survivorId !== tabId) {
             // We are the duplicated tab receiving a ping response from the original. Kick us out!
             sessionStorage.removeItem("jgl_team");
             window.location.href = "/login?kicked=1";
          }
       }
    };
    // Announce to any identical tabs that we just opened
    bc.postMessage({ type: 'PING' });

    // 2. Cross-Device Presence Lock (Remote Kick)
    const presenceChannel = supabase.channel(`presence-${infoParsed.code}`, {
      config: {
        presence: { key: tabId },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const allClients: any[] = [];
        for (const id in state) allClients.push(...state[id]);
        
        // Ensure we only sort and kick based on fully resolved connections
        const validClients = allClients.filter(c => c.online_at && c.tab_id);
        if (validClients.length <= 1) return;

        validClients.sort((a, b) => new Date(a.online_at).getTime() - new Date(b.online_at).getTime());

        if (validClients[0].tab_id !== tabId) {
          // We are a secondary login trying to log into a remote session. Kick us out!
          sessionStorage.removeItem("jgl_team");
          window.location.href = "/login?kicked=1";
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            tab_id: tabId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
      bc.close();
    };
  }, []);

  const handleVote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const points = typeof votePoints === "number" ? votePoints : parseInt(votePoints as string);
    if (isNaN(points) || points < 1 || points > 10) {
      setVoteError("Invalid points. Must be between 1 and 10.");
      return;
    }

    setVoteError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        body: JSON.stringify({
          performing_team_id: gameState.current_team_id,
          voting_team_id: teamInfo?.team_id,
          points_given: points,
        }),
      });

      if (res.ok) {
          setVotedTeamId(gameState.current_team_id);
          setVotePoints(""); 
      } else {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.error === "You have already voted for this team") {
              setVotedTeamId(gameState.current_team_id);
          } else {
              setVoteError(errorData.error || "Failed to vote. Please try again.");
          }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6 md:p-12 text-white font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Block  */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6 gap-4">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            {teamInfo?.team_name || "Loading Team..."}
          </h1>
          <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl font-mono text-lg text-gray-300 w-max shadow-inner">
            {teamInfo?.code || params.code}
          </div>
        </div>

        {/* Action / Voting Block */}
        <AnimatePresence mode="popLayout">
          {gameState?.phase === "voting_open" &&
            !!gameState?.current_team_id &&
            gameState?.current_team_id !== teamInfo?.team_id && (
              votedTeamId === gameState.current_team_id ? (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 border border-emerald-500/30 p-8 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.15)] text-center space-y-4"
                >
                  <h2 className="text-3xl font-black text-emerald-400">
                    Vote Cast!
                  </h2>
                  <p className="text-emerald-100 text-lg">
                    You have successfully voted for <strong>{gameState.current_team_name || "this team"}</strong>.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 border border-blue-500/30 p-8 rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.15)] text-center space-y-6"
                >
                  <h2 className="text-3xl font-black text-blue-100">
                    Voting is Open!
                  </h2>
                  <p className="text-blue-200 text-lg">
                    Rate the team currently on stage:{" "}
                    <strong className="text-white text-xl">
                      {gameState.current_team_name || "Loading..."}
                    </strong>
                  </p>

                  <form onSubmit={handleVote} className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={votePoints}
                      onChange={(e) => setVotePoints(e.target.value ? parseInt(e.target.value) : "")}
                      disabled={isSubmitting}
                      placeholder="Points (1-10)"
                      className="w-full md:w-48 bg-transparent border-b-2 border-gray-700 focus:border-blue-500 rounded-none p-4 text-center text-3xl font-black text-white placeholder-gray-600 focus:outline-none focus:ring-0 transition-all disabled:opacity-50"
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isSubmitting}
                      className="w-full md:w-auto px-12 py-5 bg-blue-500 hover:bg-blue-400 text-white font-black text-xl rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isSubmitting ? "CASTING..." : "CAST VOTE"}
                    </motion.button>
                  </form>
                  
                  {voteError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 font-bold bg-red-950/50 p-3 rounded-lg border border-red-900/50">
                      {voteError}
                    </motion.p>
                  )}
                </motion.div>
              )
            )}
        </AnimatePresence>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            layout
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl"
          >
            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-2">
              Current Phase
            </h3>
            <motion.div
              key={gameState?.phase}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold capitalize text-white"
            >
              {gameState?.phase
                ? gameState.phase.replace("_", " ")
                : "Loading..."}
            </motion.div>
          </motion.div>

          <motion.div
            layout
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl"
          >
            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-2">
              Stage Status
            </h3>
            <AnimatePresence mode="wait">
              {gameState?.current_team_id ? (
                <motion.div
                  key={gameState.current_team_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-xl font-medium text-white"
                >
                  Team{" "}
                  <span className="font-bold text-2xl text-emerald-400">
                    {gameState.current_team_name || gameState.current_team_id}
                  </span>{" "}
                  is performing
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xl font-medium text-gray-500"
                >
                  Stage is empty
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Live Scoreboard */}
        <AnimatePresence>
          {gameState?.phase === "results" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6 mt-8 overflow-hidden"
            >
              <h2 className="text-2xl font-black border-b border-gray-800 pb-4 text-emerald-400 tracking-wide">
                Final Results
              </h2>
              <div className="space-y-4">
                {scores
                  .sort(
                    (a, b) =>
                      (b.audience_score || 0) - (a.audience_score || 0),
                  )
                  .map((score, index) => (
                    <motion.div
                      key={score.id || index}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex justify-between items-center bg-gray-950 border border-gray-800 p-5 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 font-black text-xl w-6">
                          {index + 1}.
                        </span>
                        <span className="font-bold text-xl text-gray-100">
                          {score.name || "Unknown Team"}
                        </span>
                      </div>
                      <div className="text-emerald-400 font-black text-3xl flex items-center">
                        {score.audience_score || 0}{" "}
                        <span className="text-base font-medium text-gray-500 uppercase tracking-widest ml-2">
                          pts
                        </span>
                        {score.bonus_awarded && (
                          <span title={score.bonus_label || "Bonus Awarded"} className="text-yellow-400 text-xl ml-3">
                            🌟
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                {scores.length === 0 && (
                  <div className="text-gray-500 italic p-4 text-center">
                    No scores computed yet.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Debug Raw Data / Rest State */}
        <AnimatePresence>
          {!["voting_open", "results"].includes(gameState?.phase) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center opacity-50 pt-12"
            >
              Waiting for the next session to begin...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
