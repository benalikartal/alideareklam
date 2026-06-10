// backend/routes/shoots.js
'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

function canAccess(req, customerId) {
  if (req.user.role === 'admin') return true;
  return req.user.customerId === customerId;
}

// GET /api/shoots/:customerId
router.get('/:customerId', async (req, res) => {
  if (!canAccess(req, req.params.customerId)) {
    return res.status(403).json({ error: 'Erişim reddedildi.' });
  }
  try {
    const shoots = await db.all(
      'SELECT * FROM shoots WHERE customer_id = $1 ORDER BY date DESC',
      [req.params.customerId]
    );
    res.json(shoots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/shoots/:customerId — Çekim ekle (admin)
router.post('/:customerId', requireAdmin, async (req, res) => {
  const { title, date, description } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Başlık ve tarih gerekli.' });

  try {
    const result = await db.query(`
      INSERT INTO shoots (customer_id, title, date, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.params.customerId, title, date, description || '']);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// PATCH /api/shoots/:customerId/:shootId/done — Çekimi tamamla
router.patch('/:customerId/:shootId/done', requireAdmin, async (req, res) => {
  try {
    const shoot = await db.get('SELECT * FROM shoots WHERE id = $1 AND customer_id = $2', [req.params.shootId, req.params.customerId]);
    if (!shoot) return res.status(404).json({ error: 'Çekim bulunamadı.' });

    const newDone = shoot.done ? 0 : 1;
    await db.run('UPDATE shoots SET done = $1 WHERE id = $2', [newDone, shoot.id]);
    res.json({ success: true, done: newDone === 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// DELETE /api/shoots/:customerId/:shootId
router.delete('/:customerId/:shootId', requireAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM shoots WHERE id = $1 AND customer_id = $2', [req.params.shootId, req.params.customerId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Edit Count
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/shoots/:customerId/edit-count
router.get('/:customerId/edit-count', async (req, res) => {
  if (!canAccess(req, req.params.customerId)) {
    return res.status(403).json({ error: 'Erişim reddedildi.' });
  }
  try {
    const row = await db.get('SELECT count FROM edit_counts WHERE customer_id = $1', [req.params.customerId]);
    res.json({ count: row ? row.count : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/shoots/:customerId/edit-count — Edit sayısını güncelle (admin)
router.post('/:customerId/edit-count', requireAdmin, async (req, res) => {
  const { count } = req.body;
  const c = Math.max(0, parseInt(count) || 0);
  try {
    await db.run(`
      INSERT INTO edit_counts (customer_id, count, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT(customer_id) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at
    `, [req.params.customerId, c]);
    res.json({ success: true, count: c });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
