// backend/db.js — Veritabanı kurulumu ve seed
'use strict';

require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

// data/ klasörü yoksa oluştur
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'alidea.db'));

// Performans için WAL modu
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── TABLOLARI OLUŞTUR ────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    UNIQUE NOT NULL,
    password_hash TEXT  NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'customer',
    customer_id TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    sector      TEXT,
    status      TEXT DEFAULT 'Aktif',
    package     TEXT,
    monthly_fee REAL DEFAULT 0,
    contact     TEXT,
    tags        TEXT DEFAULT '[]',
    data        TEXT DEFAULT '{}',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id          TEXT PRIMARY KEY,
    customer_id TEXT,
    brand       TEXT NOT NULL,
    amount      REAL NOT NULL,
    status      TEXT DEFAULT 'pending',
    due_date    TEXT,
    description TEXT,
    is_software INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS calendar_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    platform    TEXT NOT NULL,
    month_key   TEXT NOT NULL,
    day         INTEGER NOT NULL,
    count       INTEGER DEFAULT 0,
    updated_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(customer_id, platform, month_key, day)
  );

  CREATE TABLE IF NOT EXISTS shoots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    title       TEXT NOT NULL,
    date        TEXT NOT NULL,
    description TEXT,
    done        INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS edit_counts (
    customer_id TEXT PRIMARY KEY,
    count       INTEGER DEFAULT 0,
    updated_at  TEXT DEFAULT (datetime('now'))
  );
`);

// ─── SEED: İlk çalıştırmada kullanıcıları oluştur ────────────────────────────

function seedUsers() {
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c > 0) return; // Zaten kullanıcı var, atla

  console.log('🌱 İlk çalıştırma — kullanıcılar oluşturuluyor...');

  // Admin
  const adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
  db.prepare(`
    INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')
  `).run(process.env.ADMIN_USERNAME, adminHash);

  // Müşteri hesapları: CUSTOMER_ACCOUNTS=kullanici:sifre:musteri_id,...
  const accounts = (process.env.CUSTOMER_ACCOUNTS || '').split(',').filter(Boolean);
  for (const account of accounts) {
    const [username, password, customerId] = account.trim().split(':');
    if (!username || !password) continue;
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(`
      INSERT OR IGNORE INTO users (username, password_hash, role, customer_id)
      VALUES (?, ?, 'customer', ?)
    `).run(username, hash, customerId || null);
  }

  console.log('✅ Kullanıcılar oluşturuldu.');
}

seedUsers();

module.exports = db;
