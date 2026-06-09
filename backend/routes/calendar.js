// backend/routes/calendar.js
'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// Müşteri erişim kontrolü
function canAccess(req, customerId) {
  if (req.user.role === 'admin') return true;
  return req.user.customerId === customerId;
}

// GET /api/calendar/:customerId — Tüm takvim verilerini getir
router.get('/:customerId', (req, res) => {
  if (!canAccess(req, req.params.customerId)) {
    return res.status(403).json({ error: 'Erişim reddedildi.' });
  }

  const entries = db.prepare(
    'SELECT platform, month_key, day, count FROM calendar_entries WHERE customer_id = ?'
  ).all(req.params.customerId);

  // { ig: { m1_5: 2, m2_10: 1 }, tt: {...}, story: {...} }
  const result = { ig: {}, tt: {}, story: {} };
  for (const e of entries) {
    if (!result[e.platform]) result[e.platform] = {};
    result[e.platform][`${e.month_key}_${e.day}`] = e.count;
  }

  res.json(result);
});

// POST /api/calendar/:customerId — Gün güncelle
router.post('/:customerId', (req, res) => {
  if (!canAccess(req, req.params.customerId)) {
    return res.status(403).json({ error: 'Erişim reddedildi.' });
  }

  const { platform, month_key, day, count } = req.body;
  if (!platform || !month_key || day === undefined) {
    return res.status(400).json({ error: 'platform, month_key ve day gerekli.' });
  }
  if (!['ig', 'tt', 'story'].includes(platform)) {
    return res.status(400).json({ error: 'Geçersiz platform.' });
  }

  const newCount = Math.max(0, parseInt(count) || 0);

  if (newCount === 0) {
    db.prepare(
      'DELETE FROM calendar_entries WHERE customer_id = ? AND platform = ? AND month_key = ? AND day = ?'
    ).run(req.params.customerId, platform, month_key, day);
  } else {
    db.prepare(`
      INSERT INTO calendar_entries (customer_id, platform, month_key, day, count, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(customer_id, platform, month_key, day)
      DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at
    `).run(req.params.customerId, platform, month_key, day, newCount);
  }

  res.json({ success: true, count: newCount });
});

// DELETE /api/calendar/:customerId — Tüm takvimi temizle
router.delete('/:customerId', requireAuth, (req, res) => {
  if (!canAccess(req, req.params.customerId)) {
    return res.status(403).json({ error: 'Erişim reddedildi.' });
  }
  const { platform } = req.query;
  if (platform) {
    db.prepare('DELETE FROM calendar_entries WHERE customer_id = ? AND platform = ?').run(req.params.customerId, platform);
  } else {
    db.prepare('DELETE FROM calendar_entries WHERE customer_id = ?').run(req.params.customerId);
  }
  res.json({ success: true });
});

module.exports = router;
