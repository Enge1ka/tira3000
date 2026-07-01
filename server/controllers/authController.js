const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

exports.register = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  if (username.trim().length < 2)
    return res.status(400).json({ error: 'Username must be at least 2 characters' });

  if (password.length < 4)
    return res.status(400).json({ error: 'Password must be at least 4 characters' });

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count >= 2)
    return res.status(403).json({ error: 'Tira is full. Only 2 accounts are allowed.' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing)
    return res.status(409).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
    .run(username.trim(), hash);

  const user = { id: result.lastInsertRowid, username: username.trim() };
  res.status(201).json({ token: signToken(user), user });
};

exports.login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid username or password' });

  const safe = { id: user.id, username: user.username };
  res.json({ token: signToken(safe), user: safe });
};

exports.me = (req, res) => {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

exports.getPartner = (req, res) => {
  const partner = db
    .prepare('SELECT id, username FROM users WHERE id != ?')
    .get(req.user.id);
  res.json(partner || null);
};
