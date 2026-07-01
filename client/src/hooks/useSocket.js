import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (user) => {
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [partnerTyping, setPartnerTyping] = useState(false);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('tira_token');
    const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    const socket = io(serverUrl || undefined, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('online_users', (ids) => setOnlineUsers(ids));
    socket.on('partner_typing', () => setPartnerTyping(true));
    socket.on('partner_stop_typing', () => setPartnerTyping(false));

    return () => socket.disconnect();
  }, [user]);

  const emitTyping = () => socketRef.current?.emit('typing');
  const emitStopTyping = () => socketRef.current?.emit('stop_typing');

  return { socket: socketRef.current, onlineUsers, partnerTyping, emitTyping, emitStopTyping };
};
