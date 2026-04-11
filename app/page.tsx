import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-white text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            Jain's Got Latent
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            Live Event Voting Platform
          </p>
        </div>

        <div className="flex flex-col w-full space-y-4 pt-8">
          <Link
            href="/login"
            className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors text-white font-bold py-4 px-6 rounded-xl shadow-[0_0_15px_rgba(5,150,105,0.3)] text-xl"
          >
            Team Login
          </Link>
        </div>
      </div>
    </div>
  );
}
