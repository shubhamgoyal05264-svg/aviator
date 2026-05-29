import sqlite3 from 'sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './game.db';

// Enable verbose mode in dev
const sqlite = process.env.NODE_ENV === 'development' ? sqlite3.verbose() : sqlite3;
const rawDb = new sqlite.Database(path.resolve(DB_PATH));

// ─── Promise helpers ──────────────────────────────────────────────────────────

export function dbRun(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    rawDb.run(sql, params, function (err) {
      if (err) reject(err); else resolve();
    });
  });
}

export function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    rawDb.get(sql, params, (err, row) => {
      if (err) reject(err); else resolve(row as T);
    });
  });
}

export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    rawDb.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows as T[]);
    });
  });
}

// ─── Schema init ─────────────────────────────────────────────────────────────

export async function initDb(): Promise<void> {
  await dbRun('PRAGMA foreign_keys = ON');
  await dbRun('PRAGMA journal_mode = WAL');

  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      username        TEXT UNIQUE NOT NULL,
      email           TEXT UNIQUE NOT NULL,
      password_hash   TEXT NOT NULL,
      real_balance    REAL NOT NULL DEFAULT 0,
      demo_balance    REAL NOT NULL DEFAULT 5000,
      kyc_status      TEXT NOT NULL DEFAULT 'NONE',
      rounds_played   INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      is_admin        INTEGER NOT NULL DEFAULT 0,
      banned          INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Safely add new columns to existing databases (no-op if already present)
  const safeAlter = async (sql: string) => { try { await dbRun(sql); } catch (_) { } };
  await safeAlter('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
  await safeAlter('ALTER TABLE users ADD COLUMN banned   INTEGER NOT NULL DEFAULT 0');

  await dbRun(`
    CREATE TABLE IF NOT EXISTS rounds (
      id                TEXT PRIMARY KEY,
      crash_point       REAL NOT NULL,
      server_seed       TEXT NOT NULL,
      server_seed_hash  TEXT NOT NULL,
      client_seed       TEXT NOT NULL,
      nonce             INTEGER NOT NULL,
      started_at        INTEGER NOT NULL,
      crashed_at        INTEGER
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS bets (
      id             TEXT PRIMARY KEY,
      round_id       TEXT NOT NULL,
      user_id        TEXT NOT NULL,
      slot           TEXT NOT NULL,
      amount         REAL NOT NULL,
      currency       TEXT NOT NULL,
      auto_cashout   REAL,
      multiplier     REAL,
      cashout_amount REAL,
      timestamp      INTEGER NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS transactions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      type       TEXT NOT NULL,
      amount     REAL NOT NULL,
      status     TEXT NOT NULL DEFAULT 'SUCCESS',
      method     TEXT NOT NULL,
      timestamp  INTEGER NOT NULL
    )
  `);
}

export default rawDb;
