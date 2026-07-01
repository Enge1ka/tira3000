const jwt = require('jsonwebtoken');

let _io = null;
const onlineUsers = new Map(); // userId -> socketId

const getIO = () => _io;

const init = (io) => {
  _io = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);

    // Broadcast updated online list to everyone
    io.emit('online_users', Array.from(onlineUsers.keys()));

    socket.on('typing', () => {
      socket.broadcast.emit('partner_typing', { userId });
    });

    socket.on('stop_typing', () => {
      socket.broadcast.emit('partner_stop_typing', { userId });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });
  });
};

module.exports = { init, getIO, onlineUsers };
