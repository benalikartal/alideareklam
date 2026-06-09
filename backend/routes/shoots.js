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
router.get('/:customerId', (req, res) => {
  if (!canAccess(req, req.params.customerId)) {
    return res.status(403).json({ error: 'Erişim reddedildi.' });
  }
  const shoots = db.prepare(
    'SELECT * FROM shoots WHERE customer_id = ? ORDER BY date DESC'
  ).all(req.params.customerId);
  res.json(shoots);
});

// POST /api/shoots/:customerId — Çekim ekle (admin)
router.post('/:customerId', requireAdmin, (req, res) => {
  const { title, date, description } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Başlık ve tarih gerekli.' });

  const result = db.prepare(`
    INSERT INTO shoots (customer_id, title, date, description)
    VALUES (?, ?, ?, ?)
  `).run(req.params.customerId, title, date, description || '');

  const created = db.prepare('SELECT * FROM shoots WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PATCH /api/shoots/:customerId/:shootId/done — Çekimi tamamla
router.patch('/:customerId/:shootId/done', requireAdmin, (req, res) => {
  const shoot = db.prepare('SELECT * FROM shoots WHERE id = ? AND customer_id = ?').get(req.params.shootId, req.params.customerId);
  if (!shoot) return res.status(404).json({ error: 'Çekim bulunamadı.' });

  const newDone = shoot.done ? 0 : 1;
  db.prepare('UPDATE shoots SET done = ? WHERE id = ?').run(newDone, shoot.id);
  res.json({ success: true, done: newDone === 1 });
});

// DELETE /api/shoots/:customerId/:shootId
router.delete('/:customerId/:shootId', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM shoots WHERE id = ? AND customer_id = ?').run(req.params.shootId, req.params.customerId);
  res.json({ success: true });
});

// ─── Edit Count ───────────────────────────────────────────────────────────────

// GET /api/shoots/:customerId/edit-count
router.get('/:customerId/edit-count', (req, res) => {
  if (!canAccess(req, req.params.customerId)) {
    return res.status(403).json({ error: 'Erişim reddedildi.' });
  }
  const row = db.prepare('SELECT count FROM edit_counts WHERE customer_id = ?').get(req.params.customerId);
  res.json({ count: row ? row.count : 0 });
});

// POST /api/shoots/:customerId/edit-count — Edit sayısını güncelle (admin)
router.post('/:customerId/edit-count', requireAdmin, (req, res) => {
  const { count } = req.body;
  const c = Math.max(0, parseInt(count) || 0);
  db.prepare(`
    INSERT INTO edit_counts (customer_id, count, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(customer_id) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at
  `).run(req.params.customerId, c);
  res.json({ success: true, count: c });
});

module.exports = router;
