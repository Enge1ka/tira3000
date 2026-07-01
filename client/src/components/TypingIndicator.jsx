export default function TypingIndicator({ partnerInitial }) {
  return (
    <div className="flex items-end gap-2 px-4 py-1 message-enter">
      <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-[10px] font-bold flex-shrink-0 mb-1">
        {partnerInitial || '?'}
      </div>
      <div className="bg-zinc-800 border border-zinc-700/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot w-1.5 h-1.5 bg-zinc-400 rounded-full block" />
        <span className="typing-dot w-1.5 h-1.5 bg-zinc-400 rounded-full block" />
        <span className="typing-dot w-1.5 h-1.5 bg-zinc-400 rounded-full block" />
      </div>
    </div>
  );
}
