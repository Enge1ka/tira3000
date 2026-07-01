const { db } = require('../database/db');
const cloudinary = require('cloudinary').v2;

const DAILY_LIMIT = 10;

const getTodayCount = (userId) => {
  const today = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM messages WHERE sender_id = ? AND date(created_at) = ?`)
    .get(userId, today);
  return row.c;
};

const getNextReset = () => {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
};

exports.getMessages = (req, res) => {
  const messages = db
    .prepare(
      `SELECT m.*, u.username as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at ASC`
    )
    .all(req.user.id, req.user.id);
  res.json(messages);
};

exports.sendMessage = (req, res) => {
  const { text } = req.body;
  const senderId = req.user.id;

  if (!text || !text.trim())
    return res.status(400).json({ error: 'Message cannot be empty' });

  const used = getTodayCount(senderId);
  if (used >= DAILY_LIMIT)
    return res.status(429).json({ error: 'Daily limit reached', used, limit: DAILY_LIMIT, nextReset: getNextReset() });

  const receiver = db.prepare('SELECT id FROM users WHERE id != ?').get(senderId);
  if (!receiver)
    return res.status(400).json({ error: 'No partner connected yet' });

  const result = db
    .prepare('INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)')
    .run(senderId, receiver.id, text.trim());

  const message = db
    .prepare(
      `SELECT m.*, u.username as sender_name FROM messages m
       JOIN users u ON m.sender_id = u.id WHERE m.id = ?`
    )
    .get(result.lastInsertRowid);

  // Emit to partner via socket if online
  const { getIO, onlineUsers } = require('../socket/socketHandler');
  const io = getIO();
  if (io) {
    const partnerSocketId = onlineUsers.get(receiver.id);
    if (partnerSocketId) io.to(partnerSocketId).emit('new_message', message);
  }

  res.json({ message, used: used + 1, limit: DAILY_LIMIT });
};

exports.uploadImage = async (req, res) => {
  const senderId = req.user.id;

  const used = getTodayCount(senderId);
  if (used >= DAILY_LIMIT)
    return res.status(429).json({ error: 'Daily limit reached', used, limit: DAILY_LIMIT, nextReset: getNextReset() });

  if (!req.file)
    return res.status(400).json({ error: 'No image provided' });

  const receiver = db.prepare('SELECT id FROM users WHERE id != ?').get(senderId);
  if (!receiver)
    return res.status(400).json({ error: 'No partner connected yet' });

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'tira', resource_type: 'image' },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const imageUrl = uploadResult.secure_url;
    const result = db
      .prepare('INSERT INTO messages (sender_id, receiver_id, image) VALUES (?, ?, ?)')
      .run(senderId, receiver.id, imageUrl);

    const message = db
      .prepare(
        `SELECT m.*, u.username as sender_name FROM messages m
         JOIN users u ON m.sender_id = u.id WHERE m.id = ?`
      )
      .get(result.lastInsertRowid);

    const { getIO, onlineUsers } = require('../socket/socketHandler');
    const io = getIO();
    if (io) {
      const partnerSocketId = onlineUsers.get(receiver.id);
      if (partnerSocketId) io.to(partnerSocketId).emit('new_message', message);
    }

    res.json({ message, used: used + 1, limit: DAILY_LIMIT });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
};

exports.getLimit = (req, res) => {
  const used = getTodayCount(req.user.id);
  res.json({ used, limit: DAILY_LIMIT, nextReset: getNextReset() });
};

exports.markRead = (req, res) => {
  db.prepare('UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND is_read = 0').run(req.user.id);

  const { getIO, onlineUsers } = require('../socket/socketHandler');
  const io = getIO();
  if (io) {
    // Notify partner their messages were read
    const sender = db.prepare('SELECT id FROM users WHERE id != ?').get(req.user.id);
    if (sender) {
      const partnerSocketId = onlineUsers.get(sender.id);
      if (partnerSocketId) io.to(partnerSocketId).emit('messages_read');
    }
  }

  res.json({ ok: true });
};
