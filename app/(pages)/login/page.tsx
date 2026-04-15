"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (isLoading || !code.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/team-login", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("jgl_team", JSON.stringify(data));
        router.push(`/team/${data.code}`);
      } else {
        alert("Login failed. Please check your team code.");
        setIsLoading(false);
      }
    } catch (e) {
      alert("Network error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-white">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Team Login
          </h1>
          <p className="text-gray-400 text-sm">
            Enter your 6-letter team code to access your console.
          </p>
        </div>

        {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kicked") === "1" && (
          <div className="bg-red-950/50 border border-red-900 text-red-400 p-4 rounded-xl text-sm font-medium text-center">
            You were securely logged out because your team signed in on another active device or browser tab.
          </div>
        )}

        <div className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABCDEF"
            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-center text-3xl font-mono tracking-[0.25em] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
            maxLength={6}
          />
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 transition-colors text-white font-bold py-4 px-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 disabled:cursor-wait"
          >
            {isLoading ? "Authenticating..." : "Enter Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
