// backend/routes/auth.js — Kimlik doğrulama endpoint'leri
'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db      = require('../db');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// ─── Rate limiter: 15 dakikada max 10 login denemesi ─────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Çok fazla başarısız giriş denemesi. 15 dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli.' });
  }

  // Kullanıcıyı bul
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());

  if (!user) {
    // Timing attack'ı önlemek için yine de hash karşılaştır
    bcrypt.compareSync('dummy', '$2a$12$dummyhashfordummypurposes123456789012345678');
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
  }

  const passwordOk = bcrypt.compareSync(password, user.password_hash);

  if (!passwordOk) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
  }

  // JWT token oluştur (1 gün geçerli)
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, customerId: user.customer_id },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  // HTTP-only cookie olarak gönder (JS okuyamaz)
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 gün
    // secure: true — Deploy'da HTTPS zorunlu olduğunda açın
  });

  // Yönlendirme URL'ini role göre belirle
  let redirectUrl = '/admin-dashboard.html';
  if (user.role === 'customer') {
    redirectUrl = '/special-customer-dashboard.html';
  }

  return res.json({
    success: true,
    role: user.role,
    username: user.username,
    redirect: redirectUrl,
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    customerId: req.user.customerId,
  });
});

// ─── POST /api/auth/verify-pin ───────────────────────────────────────────────
// Admin panelindeki modal şifre doğrulaması (overview/ödemeler için)
router.post('/verify-pin', requireAuth, (req, res) => {
  const { pin } = req.body || {};
  if (!pin) return res.status(400).json({ error: 'PIN gerekli.' });

  const correct = pin === process.env.PANEL_PIN;
  if (!correct) return res.status(401).json({ error: 'Hatalı şifre.' });

  return res.json({ success: true });
});

module.exports = router;
