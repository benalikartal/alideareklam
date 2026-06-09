// backend/routes/customers.js
'use strict';

const express = require('express');
const { v4: uuidv4 } = require('crypto');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();

// Tüm route'lar auth gerektirir
router.use(requireAuth);

// GET /api/customers — Müşteri listesi (admin: hepsi, müşteri: sadece kendisi)
router.get('/', (req, res) => {
  let customers;
  if (req.user.role === 'admin') {
    customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
  } else {
    customers = db.prepare('SELECT * FROM customers WHERE id = ?').all(req.user.customerId);
  }
  // tags ve data JSON parse
  customers = customers.map(c => ({
    ...c,
    tags: JSON.parse(c.tags || '[]'),
    data: JSON.parse(c.data || '{}'),
  }));
  res.json(customers);
});

// GET /api/customers/:id
router.get('/:id', (req, res) => {
  // Müşteri sadece kendi datasına erişebilir
  if (req.user.role === 'customer' && req.user.customerId !== req.params.id) {
    return res.status(403).json({ error: 'Erişim reddedildi.' });
  }
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı.' });
  res.json({ ...customer, tags: JSON.parse(customer.tags || '[]'), data: JSON.parse(customer.data || '{}') });
});

// POST /api/customers — Yeni müşteri ekle (sadece admin)
router.post('/', requireAdmin, (req, res) => {
  const { name, sector, status, package: pkg, monthly_fee, contact, tags, data } = req.body;
  if (!name) return res.status(400).json({ error: 'Müşteri adı gerekli.' });

  const id = 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  db.prepare(`
    INSERT INTO customers (id, name, sector, status, package, monthly_fee, contact, tags, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, sector || '', status || 'Aktif', pkg || '',
    monthly_fee || 0, contact || '',
    JSON.stringify(tags || []), JSON.stringify(data || {})
  );

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.status(201).json({ ...created, tags: JSON.parse(created.tags), data: JSON.parse(created.data) });
});

// PATCH /api/customers/:id — Müşteri güncelle (sadece admin)
router.patch('/:id', requireAdmin, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı.' });

  const { name, sector, status, package: pkg, monthly_fee, contact, tags, data } = req.body;
  db.prepare(`
    UPDATE customers SET
      name = ?, sector = ?, status = ?, package = ?,
      monthly_fee = ?, contact = ?, tags = ?, data = ?
    WHERE id = ?
  `).run(
    name || customer.name, sector ?? customer.sector, status ?? customer.status,
    pkg ?? customer.package, monthly_fee ?? customer.monthly_fee,
    contact ?? customer.contact,
    JSON.stringify(tags || JSON.parse(customer.tags)),
    JSON.stringify(data || JSON.parse(customer.data)),
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json({ ...updated, tags: JSON.parse(updated.tags), data: JSON.parse(updated.data) });
});

// DELETE /api/customers/:id (sadece admin)
router.delete('/:id', requireAdmin, (req, res) => {
  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı.' });

  // İlgili tüm verileri sil
  db.prepare('DELETE FROM payments WHERE customer_id = ?').run(req.params.id);
  db.prepare('DELETE FROM calendar_entries WHERE customer_id = ?').run(req.params.id);
  db.prepare('DELETE FROM shoots WHERE customer_id = ?').run(req.params.id);
  db.prepare('DELETE FROM edit_counts WHERE customer_id = ?').run(req.params.id);
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);

  res.json({ success: true });
});

module.exports = router;
