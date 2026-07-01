import { useState, useEffect } from 'react';

const formatTime = (ms) => {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export default function LimitCountdown({ nextReset, onReset }) {
  const [remaining, setRemaining] = useState(() => new Date(nextReset) - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const left = new Date(nextReset) - Date.now();
      setRemaining(left);
      if (left <= 0) onReset?.();
    }, 1000);
    return () => clearInterval(interval);
  }, [nextReset, onReset]);

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-5 flex flex-col items-center gap-2">
      <div className="flex gap-1 mb-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        ))}
      </div>
      <p className="text-zinc-300 text-sm font-semibold">You've used all 10 messages today</p>
      <p className="text-zinc-600 text-xs">New messages unlock in</p>
      <span className="text-white text-3xl font-mono font-bold tracking-widest mt-1">
        {formatTime(remaining)}
      </span>
    </div>
  );
}
