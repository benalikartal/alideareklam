// backend/db.js — Veritabanı kurulumu ve seed
'use strict';

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

// Veritabanı URL'si .env içinden okunacak. Örneğin Neon'dan alınan pooled URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Yardımcı query fonksiyonu, kod genelindeki değişimi minimize etmek için
const db = {
  pool,
  query: (text, params) => pool.query(text, params),
  // db.get(sql, params) => tek satır döndürür
  get: async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows[0];
  },
  // db.all(sql, params) => tüm satırları döndürür
  all: async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows;
  },
  // db.run(sql, params) => veri ekleme/güncelleme
  run: async (text, params) => {
    return await pool.query(text, params);
  }
};

// ─── TABLOLARI OLUŞTUR ────────────────────────────────────────────────────────

async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        username    TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'customer',
        customer_id TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS calendar_entries (
        id          SERIAL PRIMARY KEY,
        customer_id TEXT NOT NULL,
        platform    TEXT NOT NULL,
        month_key   TEXT NOT NULL,
        day         INTEGER NOT NULL,
        count       INTEGER DEFAULT 0,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, platform, month_key, day)
      );

      CREATE TABLE IF NOT EXISTS shoots (
        id          SERIAL PRIMARY KEY,
        customer_id TEXT NOT NULL,
        title       TEXT NOT NULL,
        date        TEXT NOT NULL,
        description TEXT,
        done        INTEGER DEFAULT 0,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS edit_counts (
        customer_id TEXT PRIMARY KEY,
        count       INTEGER DEFAULT 0,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await seedUsers();
  } catch (err) {
    console.error('Veritabanı başlatılamadı:', err);
  }
}

// ─── SEED: İlk çalıştırmada kullanıcıları oluştur ────────────────────────────

async function seedUsers() {
  const existing = await db.get('SELECT COUNT(*) as c FROM users');
  if (parseInt(existing.c) > 0) return; // Zaten kullanıcı var, atla

  console.log('🌱 İlk çalıştırma — kullanıcılar oluşturuluyor...');

  // Admin
  const adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin', 12);
  await db.query(`
    INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')
  `, [process.env.ADMIN_USERNAME || 'admin', adminHash]);

  // Müşteri hesapları: CUSTOMER_ACCOUNTS=kullanici:sifre:musteri_id,...
  const accounts = (process.env.CUSTOMER_ACCOUNTS || '').split(',').filter(Boolean);
  for (const account of accounts) {
    const [username, password, customerId] = account.trim().split(':');
    if (!username || !password) continue;
    const hash = bcrypt.hashSync(password, 12);
    await db.query(`
      INSERT INTO users (username, password_hash, role, customer_id)
      VALUES ($1, $2, 'customer', $3)
      ON CONFLICT (username) DO NOTHING
    `, [username, hash, customerId || null]);
  }

  console.log('✅ Kullanıcılar oluşturuldu.');
}

initDB();

module.exports = db;
