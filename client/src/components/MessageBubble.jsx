import { format } from 'date-fns';

export default function MessageBubble({ message, isOwn, partnerInitial }) {
  const time = format(new Date(message.created_at), 'HH:mm');

  return (
    <div className={`flex items-end gap-2 px-4 py-0.5 message-enter ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {/* Partner avatar */}
      {!isOwn && (
        <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-[10px] font-bold flex-shrink-0 mb-1">
          {partnerInitial || '?'}
        </div>
      )}

      <div className={`max-w-[68%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-2.5 break-words shadow-sm ${
          isOwn
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/50'
        }`}>
          {message.image ? (
            <img
              src={message.image}
              alt="shared"
              className="rounded-xl max-w-full max-h-72 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.image, '_blank')}
            />
          ) : (
            <p className="text-sm leading-relaxed">{message.text}</p>
          )}
        </div>

        <div className={`flex items-center gap-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-zinc-600 text-[10px]">{time}</span>
          {isOwn && (
            <span className={`text-[11px] ${message.is_read ? 'text-blue-400' : 'text-zinc-600'}`}>
              {message.is_read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>

      {/* Own avatar spacer */}
      {isOwn && <div className="w-6 flex-shrink-0" />}
    </div>
  );
}
