'use client';
import { useState, useEffect } from 'react';

export default function Admin() {
  const [pass, setPass] = useState('');
  
  // Ping interval to keep Vercel function warm
  useEffect(() => {
    const interval = setInterval(() => { fetch('/api/ping').catch(() => {}) }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const createTeam = async () => {
    const name = prompt("Team name:");
    if (!name) return;
    await fetch('/api/admin/create-team', {
      method: 'POST', headers: { 'x-admin-password': pass }, body: JSON.stringify({ name })
    });
    alert('Create team request sent!');
  };

  const setPhase = async (phase: string) => {
    await fetch('/api/admin/set-phase', {
      method: 'POST', headers: { 'x-admin-password': pass }, body: JSON.stringify({ phase })
    });
  };

  const setStage = async () => {
    const id = prompt("Enter the ID of the Team performing right now:");
    if (!id) return;
    await fetch('/api/admin/set-stage', {
      method: 'POST', headers: { 'x-admin-password': pass }, body: JSON.stringify({ team_id: parseInt(id) })
    });
    alert('Set stage request sent!');
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6 md:p-12 text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-black border-b border-gray-800 pb-6 text-gray-100">
          Admin Control Center
        </h1>
        
        <div className="bg-gray-900 border border-gray-800 p-6 md:p-8 rounded-2xl shadow-xl space-y-4">
          <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider">
            Master Authentication
          </label>
          <input 
            type="password" 
            placeholder="Enter Admin Password" 
            onChange={e => setPass(e.target.value)} 
            className="w-full max-w-md bg-gray-950 border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono" 
          />
          <p className="text-xs text-red-400 mt-2">* Required for all actions below</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-gray-300">Phase Controls</h2>
            <div className="flex flex-col space-y-3">
              <button className="bg-gray-800 hover:bg-gray-700 text-white font-semibold p-4 rounded-xl border border-gray-700 transition" onClick={() => setPhase('waiting')}>Phase: Waiting Setup</button>
              <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold p-4 rounded-xl transition" onClick={() => setPhase('voting_open')}>Phase: Voting Open</button>
              <button className="bg-red-600 hover:bg-red-500 text-white font-semibold p-4 rounded-xl transition" onClick={() => setPhase('voting_closed')}>Phase: Voting Closed</button>
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold p-4 rounded-xl transition" onClick={() => setPhase('results')}>Phase: Show Results</button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-gray-300">Team & Stage Controls</h2>
            <div className="flex flex-col space-y-3">
              <button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold p-4 rounded-xl transition" onClick={createTeam}>+ Create New Team</button>
              <button className="bg-purple-600 hover:bg-purple-500 text-white font-semibold p-4 rounded-xl transition" onClick={setStage}>Change Performing Stage</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
