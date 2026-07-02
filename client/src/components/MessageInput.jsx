import { useState, useRef } from 'react';

export default function MessageInput({ onSend, onImageSend, limitReached, noPartner, limitInfo, emitTyping, emitStopTyping }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const typingTimeout = useRef(null);
  const isTypingRef = useRef(false);

  const sendDisabled = limitReached || noPartner || sending;
  const inputDisabled = limitReached || sending;

  const handleChange = (e) => {
    setText(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping?.();
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTypingRef.current = false;
      emitStopTyping?.();
    }, 1500);
  };

  const handleSend = async () => {
    if (!text.trim() || sendDisabled) return;
    setSending(true);
    clearTimeout(typingTimeout.current);
    isTypingRef.current = false;
    emitStopTyping?.();
    try {
      await onSend(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file || sendDisabled) return;
    setSending(true);
    try {
      await onImageSend(file);
    } finally {
      setSending(false);
      e.target.value = '';
    }
  };

  const used = limitInfo?.used ?? 0;
  const limit = limitInfo?.limit ?? 10;
  const pct = Math.round((used / limit) * 100);
  const barColor = used >= limit ? 'bg-red-500' : used >= limit * 0.7 ? 'bg-amber-500' : 'bg-blue-500';

  const placeholder = noPartner
    ? 'Waiting for partner to join…'
    : limitReached
    ? 'Come back tomorrow'
    : 'Message…';

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 pt-3 pb-4">

      {/* No partner banner */}
      {noPartner && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse" />
            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse delay-75" />
            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse delay-150" />
          </div>
          <span className="text-zinc-600 text-xs">Waiting for the second person to create an account</span>
        </div>
      )}

      {/* Limit bar */}
      {limitInfo && !noPartner && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-zinc-600 text-[11px]">Today's messages</span>
            <span className={`text-[11px] font-semibold tabular-nums ${used >= limit ? 'text-red-400' : used >= limit * 0.7 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {used} / {limit}
            </span>
          </div>
          <div className="w-full h-0.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-end gap-3">
        <button
          onClick={async () => {
            try { fileRef.current?.click(); }
            catch { alert('Image uploads not available yet'); }
          }}
          disabled={sendDisabled}
          className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30 pb-2 flex-shrink-0"
          title="Send image (requires Cloudinary setup)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
          disabled={inputDisabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-2xl px-4 py-2.5 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-500/40 disabled:opacity-40 max-h-32 leading-relaxed transition-all"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || sendDisabled}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
