// backend/routes/payments.js
'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// GET /api/payments — Ödeme listesi
router.get('/', (req, res) => {
  let payments;
  if (req.user.role === 'admin') {
    const { type } = req.query; // type=reklam | software | all
    if (type === 'reklam') {
      payments = db.prepare("SELECT * FROM payments WHERE is_software = 0 ORDER BY created_at DESC").all();
    } else if (type === 'software') {
      payments = db.prepare("SELECT * FROM payments WHERE is_software = 1 ORDER BY created_at DESC").all();
    } else {
      payments = db.prepare("SELECT * FROM payments ORDER BY created_at DESC").all();
    }
  } else {
    // Müşteri sadece kendi ödemelerini görür
    payments = db.prepare('SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC').all(req.user.customerId);
  }
  res.json(payments);
});

// POST /api/payments — Ödeme ekle (admin)
router.post('/', requireAdmin, (req, res) => {
  const { customer_id, brand, amount, status, due_date, description, is_software } = req.body;
  if (!brand || !amount) return res.status(400).json({ error: 'Marka ve tutar gerekli.' });

  const id = 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  db.prepare(`
    INSERT INTO payments (id, customer_id, brand, amount, status, due_date, description, is_software)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, customer_id || null, brand, amount, status || 'pending', due_date || null, description || '', is_software ? 1 : 0);

  const created = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  res.status(201).json(created);
});

// PATCH /api/payments/:id/status — Durum güncelle
router.patch('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!['paid', 'unpaid', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum.' });
  }
  const p = db.prepare('SELECT id FROM payments WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Ödeme bulunamadı.' });

  db.prepare("UPDATE payments SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

// DELETE /api/payments/:id
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
