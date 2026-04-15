'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function InspectGuard() {
  const [isGuarded, setIsGuarded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      setIsGuarded(false);
      return;
    }

    // Silent polling for inspect mode state
    const checkInspectMode = async () => {
      try {
        const res = await fetch(`/api/game-state?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setIsGuarded(!!data.inspect_mode);
        }
      } catch (e) {
        // fail silently
      }
    };

    checkInspectMode();
    const interval = setInterval(checkInspectMode, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isGuarded) return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGuarded]);

  return null; // Silent background element
}
