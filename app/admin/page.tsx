"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function Admin() {
  const [pass, setPass] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>({
    phase: "waiting",
    current_team_id: null,
  });
  const [teams, setTeams] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [logs, setLogs] = useState<
    {
      id: number;
      text: string;
      status: "success" | "error" | "pending";
      time: string;
    }[]
  >([]);

  const [newTeamName, setNewTeamName] = useState("");

  // Initialization and Real-Time Sync
  useEffect(() => {
    if (!isAuthenticated) return;

    // Ping interval to keep server alive
    const pingInterval = setInterval(
      () => {
        fetch("/api/ping").catch(() => {});
      },
      2 * 60 * 1000,
    );

    const loadInitialData = async () => {
      const { data: gData } = await supabase
        .from("game_state")
        .select("*")
        .limit(1)
        .single();
      if (gData) setGameState(gData);

      const { data: tData } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: true });
      if (tData) setTeams(tData);

      const { data: sData } = await supabase
        .from("scores")
        .select("*")
        .order("total_score", { ascending: false });
      if (sData) setScores(sData);
    };

    loadInitialData();

    // Subscribe to changes on game_state and scores
    const channel = supabase
      .channel("admin-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state" },
        (payload) => {
          setGameState(payload.new);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        async () => {
          // Just reload scores list
          const { data: sData } = await supabase
            .from("scores")
            .select("*")
            .order("total_score", { ascending: false });
          if (sData) setScores(sData);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        async () => {
          const { data: tData } = await supabase
            .from("teams")
            .select("*")
            .order("created_at", { ascending: true });
          if (tData) setTeams(tData);
        },
      )
      .subscribe();

    return () => {
      clearInterval(pingInterval);
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "x-admin-password": pass },
    });

    if (res.ok) setIsAuthenticated(true);
    else {
      alert("SYS_ERR: UNAUTHORIZED");
      setPass("");
    }
    setIsChecking(false);
  };

  const addLog = (text: string, status: "success" | "error" | "pending") => {
    setLogs((prev) => {
      const newLog = {
        id: Date.now() + Math.random(),
        text,
        status,
        time: new Date().toLocaleTimeString(),
      };
      return [newLog, ...prev].slice(0, 15);
    });
  };

  const executeAction = async (
    taskId: string,
    endpoint: string,
    payload: any,
    actionDesc: string,
  ) => {
    setRunningTask(taskId);

    addLog(`Initiating: ${actionDesc}`, "pending");

    try {
      const [res] = await Promise.all([
        fetch(endpoint, {
          method: "POST",
          headers: { "x-admin-password": pass },
          body: JSON.stringify(payload),
        }),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      if (!res.ok) {
        addLog(`FAILED: ${actionDesc} (${res.statusText})`, "error");
        alert(`ACTION FAILED: ${res.statusText}`);
      } else {
        addLog(`SUCCESS: ${actionDesc}`, "success");
      }

      // FALLBACK REFETCH
      const { data: gData } = await supabase
        .from("game_state")
        .select("*")
        .limit(1)
        .single();
      if (gData) setGameState(gData);

      const { data: tData } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: true });
      if (tData) setTeams(tData);
    } catch (e: any) {
      addLog(`FATAL ERROR: ${e.message}`, "error");
      alert(`SYS_ERR: ${e.message}`);
    } finally {
      setRunningTask(null);
    }
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    executeAction(
      "create_team",
      "/api/admin/create-team",
      { name: newTeamName.trim() },
      `Spawn Team "${newTeamName.trim()}"`,
    );
    setNewTeamName("");
  };

  const handleDeleteTeam = (team: any) => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete team "${team.name}"? This will wipe all their scores and votes too.`,
      )
    ) {
      executeAction(
        `delete_${team.id}`,
        "/api/admin/delete-team",
        { team_id: team.id },
        `Delete Team "${team.name}"`,
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-[#ededed] font-mono selection:bg-[#00FF41] selection:text-black">
        <form
          onSubmit={handleLogin}
          className="border-2 border-[#333] p-8 w-full max-w-md relative bg-black"
        >
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#00FF41]"></div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#00FF41]"></div>

          <div className="mb-8 border-b-2 border-[#333] pb-4">
            <h1 className="text-2xl font-bold tracking-tighter uppercase mb-1">
              System Override
            </h1>
            <p className="text-[#666] text-xs tracking-widest uppercase">
              Target: Event Control Deck
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[#00FF41] text-xs font-bold mb-2 tracking-[0.2em] uppercase">
                Auth Key
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#444] py-3 text-[#ededed] focus:outline-none focus:border-[#00FF41] transition-colors font-mono text-xl tracking-[0.5em] text-center"
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isChecking}
              className="w-full bg-[#ededed] text-black hover:bg-[#00FF41] disabled:opacity-50 font-bold py-4 transition-colors uppercase tracking-[0.1em] text-sm"
            >
              {isChecking ? "Authenticating..." : "[ Execute Access ]"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 md:p-8 lg:p-12 text-[#ededed] font-mono selection:bg-[#00FF41] selection:text-black">
      <div className="max-w-[1400px] mx-auto">
        {/* Top Header Bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-[#333] pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tighter text-[#00FF41]">
              Admin.Control
            </h1>
            <p className="text-[#666] text-xs tracking-widest mt-1 uppercase">
              Jain's Got Latent — Live Event Switchboard
            </p>
          </div>

          <div className="flex items-center gap-6 mt-4 md:mt-0">
            {runningTask && (
              <div className="text-yellow-500 text-xs font-bold uppercase flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Transmitting Data...
              </div>
            )}
            <button
              disabled={runningTask !== null}
              onClick={() => setIsAuthenticated(false)}
              className="px-4 py-2 border-2 border-[#333] hover:border-red-500 hover:text-red-500 text-xs tracking-widest uppercase transition-colors disabled:opacity-50"
            >
              Terminate Session
            </button>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Phase & Add Teams */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            {/* Phase Controls */}
            <div className="border-2 border-[#333] p-6 relative">
              <h2 className="text-[#00FF41] text-xs font-bold mb-6 tracking-[0.2em] uppercase flex items-center gap-2">
                <span
                  className={`w-2 h-2 block ${runningTask ? "bg-yellow-500" : "bg-[#00FF41] animate-pulse"}`}
                ></span>
                Phase Controls
              </h2>

              <div className="mb-6 p-4 border border-[#333] bg-[#111]">
                <div className="text-[10px] text-[#666] tracking-[0.2em] uppercase mb-1">Currently On Stage</div>
                {gameState.current_team_id ? (
                  <div className="text-[#00FF41] font-bold tracking-wider uppercase">
                    {teams.find((t) => t.id === gameState.current_team_id)?.name || "UNKNOWN TEAM"}
                  </div>
                ) : (
                  <div className="text-yellow-500 font-bold tracking-wider uppercase animate-pulse">
                    NO ONE HERE - WAITING FOR ADMIN
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-4">
                <PhaseButton
                  label="[XX] Stop / Clear Stage"
                  alert
                  taskId="clear_stage"
                  runningTask={runningTask}
                  active={!gameState.current_team_id}
                  onClick={() =>
                    executeAction(
                      "clear_stage",
                      "/api/admin/clear-stage",
                      {},
                      "Clear Stage",
                    )
                  }
                />
                <PhaseButton
                  label="[00] Waiting / Setup"
                  taskId="phase_waiting"
                  runningTask={runningTask}
                  active={gameState.phase === "waiting"}
                  onClick={() =>
                    executeAction(
                      "phase_waiting",
                      "/api/admin/set-phase",
                      { phase: "waiting" },
                      "Set Phase: Waiting/Setup",
                    )
                  }
                />
                <PhaseButton
                  label="[01] Voting Open"
                  taskId="phase_open"
                  runningTask={runningTask}
                  active={gameState.phase === "voting_open"}
                  onClick={() =>
                    executeAction(
                      "phase_open",
                      "/api/admin/set-phase",
                      { phase: "voting_open" },
                      "Set Phase: Voting Open",
                    )
                  }
                />
                <PhaseButton
                  label="[02] Voting Closed"
                  alert
                  taskId="phase_closed"
                  runningTask={runningTask}
                  active={gameState.phase === "voting_closed"}
                  onClick={() =>
                    executeAction(
                      "phase_closed",
                      "/api/admin/set-phase",
                      { phase: "voting_closed" },
                      "Set Phase: Voting Closed",
                    )
                  }
                />
                <PhaseButton
                  label="[03] Show Results"
                  taskId="phase_results"
                  runningTask={runningTask}
                  active={gameState.phase === "results"}
                  onClick={() =>
                    executeAction(
                      "phase_results",
                      "/api/admin/set-phase",
                      { phase: "results" },
                      "Set Phase: Show Results",
                    )
                  }
                />
              </div>
            </div>

            {/* Add Teams Box */}
            <div className="border-2 border-[#333] p-6 relative">
              <h2 className="text-[#00FF41] text-xs font-bold mb-6 tracking-[0.2em] uppercase">
                Add Teams
              </h2>
              <form onSubmit={handleCreateTeam} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Team Name..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-transparent border-2 border-[#333] px-4 py-3 text-sm focus:border-[#00FF41] focus:outline-none transition-colors"
                  disabled={runningTask !== null}
                />
                <button
                  type="submit"
                  disabled={newTeamName.trim() === "" || runningTask !== null}
                  className="bg-[#ededed] text-black px-6 py-3 uppercase tracking-widest font-bold text-xs hover:bg-[#00FF41] transition-colors disabled:opacity-50"
                >
                  ADD
                </button>
              </form>
            </div>
          </div>

          {/* MIDDLE COLUMN: Team Roster (Audience Push) */}
          <div className="lg:col-span-4 h-full border-2 border-[#333] p-6 flex flex-col max-h-[80vh]">
            <h2 className="text-[#00FF41] text-xs font-bold mb-6 tracking-[0.2em] uppercase">
              Roster / Audience Push
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {teams.length === 0 && (
                <div className="text-[#444] text-xs border border-[#333] p-4 text-center">
                  NO TEAMS ESTABLISHED
                </div>
              )}
              {teams.map((team) => {
                const isOnStage = gameState.current_team_id === team.id;

                return (
                  <div
                    key={team.id}
                    className={`border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isOnStage ? "border-[#00FF41] bg-[#00FF41]/10" : "border-[#333] hover:border-[#666]"}`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`font-bold uppercase tracking-widest ${isOnStage ? "text-[#00FF41]" : "text-[#ededed]"}`}
                      >
                        {team.name}
                      </span>
                      <span className="text-xs text-[#666] tracking-[0.2em] mt-1 space-x-2">
                        <span>
                          CODE:{" "}
                          <strong className="text-[#ededed]">
                            {team.code}
                          </strong>
                        </span>
                      </span>
                      {scores.find((s) => s.team_id === team.id)
                        ?.bonus_awarded && (
                        <span className="text-[#00FF41] text-xs uppercase tracking-widest font-bold mt-2 animate-pulse">
                          ⚡ Bonus Applied!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        title={
                          scores.find((s) => s.team_id === team.id)
                            ?.bonus_awarded
                            ? "Dismiss Bonus"
                            : "Award Bonus"
                        }
                        disabled={runningTask !== null}
                        onClick={() => {
                          const hasBonus = scores.find(
                            (s) => s.team_id === team.id,
                          )?.bonus_awarded;
                          if (hasBonus) {
                            if (
                              window.confirm(
                                `[REVOKE] Remove Admin Bonus from "${team.name}"?`,
                              )
                            ) {
                              executeAction(
                                `bonus_${team.id}`,
                                "/api/admin/award-bonus",
                                { team_id: team.id, action: "dismiss" },
                                `Dismiss Bonus from "${team.name}"`,
                              );
                            }
                          } else {
                            if (
                              window.confirm(
                                `[AWARD] Give an Admin Bonus to "${team.name}"?`,
                              )
                            ) {
                              executeAction(
                                `bonus_${team.id}`,
                                "/api/admin/award-bonus",
                                {
                                  team_id: team.id,
                                  bonus_label: "Admin Bonus",
                                },
                                `Award Bonus to "${team.name}"`,
                              );
                            }
                          }
                        }}
                        className={`text-xs px-3 py-2 font-bold uppercase border transition-colors 
                          ${
                            scores.find((s) => s.team_id === team.id)
                              ?.bonus_awarded
                              ? "border-[#333] text-red-500 hover:bg-red-500 hover:text-white"
                              : "border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                          } 
                          ${runningTask === `bonus_${team.id}` ? "opacity-50 cursor-wait" : ""}`}
                      >
                        {scores.find((s) => s.team_id === team.id)
                          ?.bonus_awarded
                          ? "✖"
                          : "B"}
                      </button>
                      <button
                        disabled={runningTask !== null || isOnStage}
                        onClick={() =>
                          executeAction(
                            `stage_${team.code}`,
                            "/api/admin/set-stage",
                            { team_id: team.id },
                            `Push Team "${team.name}" to Stage`,
                          )
                        }
                        className={`text-xs px-4 py-2 border font-bold uppercase tracking-widest transition-colors whitespace-nowrap
                            ${
                              isOnStage
                                ? "border-transparent text-[#00FF41] opacity-60 cursor-default"
                                : "border-[#333] text-[#ededed] hover:bg-[#ededed] hover:text-black"
                            } 
                            ${runningTask === `stage_${team.code}` ? "!bg-yellow-500 !text-black !border-yellow-500" : ""}`}
                      >
                        {isOnStage
                          ? "ON STAGE"
                          : runningTask === `stage_${team.code}`
                            ? "PUSHING..."
                            : "PUSH TO STAGE"}
                      </button>
                      <button
                        disabled={runningTask !== null}
                        onClick={() => handleDeleteTeam(team)}
                        title="Delete Team"
                        className="text-xs px-3 py-2 border border-[#333] text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                      >
                        X
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Projector Launch */}
          <div className="lg:col-span-4 h-full border-2 border-[#333] p-6 flex flex-col justify-center items-center text-center">
            <h2 className="text-[#00FF41] text-xs font-bold mb-6 tracking-[0.2em] uppercase">
              Big Screen Access
            </h2>
            <p className="text-[#666] text-xs uppercase tracking-widest mb-12">
              Launch the dedicated, full-screen leaderboard interface on a
              projector or external display.
            </p>
            <a
              href="/results"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-black transition-colors px-8 py-6 uppercase font-bold tracking-widest flex items-center gap-4 group w-full justify-center"
            >
              <span>Launch Projector</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                ↗
              </span>
            </a>
          </div>

          {/* BOTTOM ROW: Action Log Terminal */}
          <div className="lg:col-span-12 border-2 border-[#333] p-6 bg-[#0a0a0a] min-h-[250px] flex flex-col font-mono">
            <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-4">
              <h2 className="text-[#00FF41] text-xs font-bold tracking-[0.2em] uppercase">
                System Action Log
              </h2>
              <span className="text-[#666] text-xs">Waiting for events...</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {logs.length === 0 && (
                <div className="text-[#444] text-xs opacity-50">
                  Log empty. Actions will be recorded here.
                </div>
              )}
              {logs.map((log) => {
                let color = "text-[#888]";
                if (log.status === "success") color = "text-[#00FF41]";
                if (log.status === "error") color = "text-red-500";
                if (log.status === "pending") color = "text-yellow-500";

                return (
                  <div
                    key={log.id}
                    className="flex gap-4 text-xs tracking-wider"
                  >
                    <span className="text-[#555] shrink-0">[{log.time}]</span>
                    <span className={`${color}`}>
                      {log.status === "pending"
                        ? "..."
                        : log.status === "success"
                          ? "✔"
                          : "✖"}{" "}
                      {log.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for strictly styled buttons
function PhaseButton({
  label,
  taskId,
  runningTask,
  onClick,
  active = false,
  alert = false,
}: any) {
  const isRunning = runningTask === taskId;
  let baseColor = "border-[#333] text-[#ededed] hover:bg-[#222]";

  if (active)
    baseColor =
      "border-[#00FF41] text-[#00FF41] bg-[#00FF41]/10 hover:bg-[#00FF41] hover:text-black";
  if (alert && active)
    baseColor =
      "border-red-500 text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white";
  else if (alert)
    baseColor = "border-[#333] text-red-500 hover:bg-red-500 hover:text-white";

  if (isRunning)
    baseColor =
      "border-yellow-500 text-yellow-500 bg-yellow-500/10 cursor-wait";

  return (
    <button
      disabled={runningTask !== null}
      onClick={onClick}
      className={`border-2 p-4 text-left transition-all uppercase tracking-widest text-sm font-bold flex justify-between items-center group disabled:opacity-40 disabled:cursor-not-allowed ${baseColor}`}
    >
      <span>{isRunning ? "TRANSMITTING..." : label}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity font-normal">
        {isRunning ? "⧗" : "→"}
      </span>
    </button>
  );
}
