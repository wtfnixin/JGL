'use client'; // Error components must be Client Components
import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Log the error securely
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <button 
          onClick={() => reset()} 
          className="px-4 py-2 bg-indigo-500 rounded hover:bg-indigo-600 transition"
        >
          Try repairing connection
        </button>
      </div>
    </div>
  );
}
