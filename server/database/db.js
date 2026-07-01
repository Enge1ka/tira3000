const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'tira.db');
let _sqlDb = null;

const save = () => {
  const data = _sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
};

// Wrapper that mimics better-sqlite3's synchronous API
const db = {
  prepare(sql) {
    return {
      get: (...args) => {
        const stmt = _sqlDb.prepare(sql);
        const params = args.flat();
        if (params.length) stmt.bind(params);
        const row = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        return row;
      },
      all: (...args) => {
        const stmt = _sqlDb.prepare(sql);
        const params = args.flat();
        if (params.length) stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      run: (...args) => {
        const stmt = _sqlDb.prepare(sql);
        const params = args.flat();
        if (params.length) stmt.bind(params);
        stmt.step();
        stmt.free();
        const idRes = _sqlDb.exec('SELECT last_insert_rowid()');
        const lastInsertRowid = idRes[0]?.values[0][0] ?? null;
        save();
        return { lastInsertRowid };
      },
    };
  },
  exec(sql) {
    _sqlDb.run(sql);
    save();
  },
};

const init = async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    _sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _sqlDb = new SQL.Database();
  }

  _sqlDb.run('PRAGMA journal_mode = WAL');
  _sqlDb.run('PRAGMA foreign_keys = ON');

  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      text TEXT,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0
    );
  `);

  return db;
};

module.exports = { db, init };
