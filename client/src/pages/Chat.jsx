import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import LimitCountdown from '../components/LimitCountdown';

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const bottomRef = useRef(null);
  const { socket, onlineUsers, partnerTyping, emitTyping, emitStopTyping } = useSocket(user);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/messages'),
      api.get('/messages/limit'),
      api.get('/auth/partner'),
    ]).then(([msgsRes, limitRes, partnerRes]) => {
      setMessages(msgsRes.data);
      setLimitInfo(limitRes.data);
      setPartner(partnerRes.data);
    }).finally(() => setLoadingMsgs(false));
  }, []);

  useEffect(() => {
    if (!loadingMsgs) scrollToBottom('instant');
  }, [loadingMsgs]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
      api.post('/messages/read').catch(() => {});
    });
    socket.on('messages_read', () => {
      setMessages((prev) =>
        prev.map((m) => m.sender_id === user.id ? { ...m, is_read: 1 } : m)
      );
    });
    return () => { socket.off('new_message'); socket.off('messages_read'); };
  }, [socket, user]);

  useEffect(() => { scrollToBottom(); }, [messages, partnerTyping]);

  useEffect(() => { api.post('/messages/read').catch(() => {}); }, []);

  const handleSend = async (text) => {
    const res = await api.post('/messages', { text });
    setMessages((prev) => [...prev, res.data.message]);
    setLimitInfo((prev) => ({ ...prev, used: res.data.used }));
    scrollToBottom();
  };

  const handleImageSend = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setMessages((prev) => [...prev, res.data.message]);
    setLimitInfo((prev) => ({ ...prev, used: res.data.used }));
    scrollToBottom();
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const limitReached = limitInfo && limitInfo.used >= limitInfo.limit;
  const partnerOnline = partner && onlineUsers.includes(partner.id);
  const partnerInitial = partner?.username?.[0]?.toUpperCase();
  const myInitial = user?.username?.[0]?.toUpperCase();

  return (
    <div className="h-screen flex flex-col bg-zinc-950">

      {/* Header */}
      <header className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 h-16">

          {/* Left: Logo */}
          <div className="flex items-center gap-2 w-1/3">
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg tracking-tight leading-none">Tira<span className="text-blue-500">3000</span></span>
              <span className="text-zinc-600 text-[10px] tracking-wide">10 msgs/day</span>
            </div>
          </div>

          {/* Center: Partner status */}
          <div className="flex flex-col items-center w-1/3">
            {partner ? (
              <>
                <span className="text-white text-sm font-semibold">{partner.username}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-600'}`} />
                  <span className={`text-[11px] font-medium ${partnerOnline ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {partnerOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-zinc-400 text-xs">Waiting for partner</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-pulse delay-75" />
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            )}
          </div>

          {/* Right: My avatar + logout */}
          <div className="flex items-center gap-2 w-1/3 justify-end">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold select-none">
              {myInitial}
            </div>
            <button onClick={handleLogout} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors ml-1">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {loadingMsgs ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce delay-75" />
              <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
              💬
            </div>
            <p className="text-zinc-500 text-sm font-medium">No messages yet</p>
            <p className="text-zinc-700 text-xs">
              {partner ? `You have 10 messages today — use them well` : 'Waiting for the second user to join'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === user.id}
                partnerInitial={partnerInitial}
              />
            ))}
            {partnerTyping && <TypingIndicator partnerInitial={partnerInitial} />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Limit countdown */}
      {limitReached && (
        <LimitCountdown
          nextReset={limitInfo.nextReset}
          onReset={() => api.get('/messages/limit').then((r) => setLimitInfo(r.data))}
        />
      )}

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onImageSend={handleImageSend}
        limitReached={limitReached}
        noPartner={!partner}
        limitInfo={limitInfo}
        emitTyping={emitTyping}
        emitStopTyping={emitStopTyping}
      />
    </div>
  );
}
