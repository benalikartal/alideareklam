// backend/routes/payments.js
'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// GET /api/payments — Ödeme listesi
router.get('/', async (req, res) => {
  try {
    let payments;
    if (req.user.role === 'admin') {
      const { type } = req.query; // type=reklam | software | all
      if (type === 'reklam') {
        payments = await db.all("SELECT * FROM payments WHERE is_software = 0 ORDER BY created_at DESC");
      } else if (type === 'software') {
        payments = await db.all("SELECT * FROM payments WHERE is_software = 1 ORDER BY created_at DESC");
      } else {
        payments = await db.all("SELECT * FROM payments ORDER BY created_at DESC");
      }
    } else {
      // Müşteri sadece kendi ödemelerini görür
      payments = await db.all('SELECT * FROM payments WHERE customer_id = $1 ORDER BY created_at DESC', [req.user.customerId]);
    }
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/payments — Ödeme ekle (admin)
router.post('/', requireAdmin, async (req, res) => {
  const { customer_id, brand, amount, status, due_date, description, is_software } = req.body;
  if (!brand || !amount) return res.status(400).json({ error: 'Marka ve tutar gerekli.' });

  const id = 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  try {
    await db.run(`
      INSERT INTO payments (id, customer_id, brand, amount, status, due_date, description, is_software)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, customer_id || null, brand, amount, status || 'pending', due_date || null, description || '', is_software ? 1 : 0]);

    const created = await db.get('SELECT * FROM payments WHERE id = $1', [id]);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// PATCH /api/payments/:id/status — Durum güncelle
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['paid', 'unpaid', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum.' });
  }
  try {
    const p = await db.get('SELECT id FROM payments WHERE id = $1', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'Ödeme bulunamadı.' });

    await db.run("UPDATE payments SET status = $1 WHERE id = $2", [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM payments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
