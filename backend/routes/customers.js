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
router.get('/', async (req, res) => {
  try {
    let customers;
    if (req.user.role === 'admin') {
      customers = await db.all('SELECT * FROM customers ORDER BY created_at DESC');
    } else {
      customers = await db.all('SELECT * FROM customers WHERE id = $1', [req.user.customerId]);
    }
    // tags ve data JSON parse
    customers = customers.map(c => ({
      ...c,
      tags: JSON.parse(c.tags || '[]'),
      data: JSON.parse(c.data || '{}'),
    }));
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  // Müşteri sadece kendi datasına erişebilir
  if (req.user.role === 'customer' && req.user.customerId !== req.params.id) {
    return res.status(403).json({ error: 'Erişim reddedildi.' });
  }
  try {
    const customer = await db.get('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı.' });
    res.json({ ...customer, tags: JSON.parse(customer.tags || '[]'), data: JSON.parse(customer.data || '{}') });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/customers — Yeni müşteri ekle (sadece admin)
router.post('/', requireAdmin, async (req, res) => {
  const { name, sector, status, package: pkg, monthly_fee, contact, tags, data } = req.body;
  if (!name) return res.status(400).json({ error: 'Müşteri adı gerekli.' });

  const id = 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  try {
    await db.run(`
      INSERT INTO customers (id, name, sector, status, package, monthly_fee, contact, tags, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      id, name, sector || '', status || 'Aktif', pkg || '',
      monthly_fee || 0, contact || '',
      JSON.stringify(tags || []), JSON.stringify(data || {})
    ]);

    const created = await db.get('SELECT * FROM customers WHERE id = $1', [id]);
    res.status(201).json({ ...created, tags: JSON.parse(created.tags), data: JSON.parse(created.data) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// PATCH /api/customers/:id — Müşteri güncelle (sadece admin)
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const customer = await db.get('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı.' });

    const { name, sector, status, package: pkg, monthly_fee, contact, tags, data } = req.body;
    await db.run(`
      UPDATE customers SET
        name = $1, sector = $2, status = $3, package = $4,
        monthly_fee = $5, contact = $6, tags = $7, data = $8
      WHERE id = $9
    `, [
      name || customer.name, sector ?? customer.sector, status ?? customer.status,
      pkg ?? customer.package, monthly_fee ?? customer.monthly_fee,
      contact ?? customer.contact,
      JSON.stringify(tags || JSON.parse(customer.tags)),
      JSON.stringify(data || JSON.parse(customer.data)),
      req.params.id
    ]);

    const updated = await db.get('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    res.json({ ...updated, tags: JSON.parse(updated.tags), data: JSON.parse(updated.data) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// DELETE /api/customers/:id (sadece admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const customer = await db.get('SELECT id FROM customers WHERE id = $1', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı.' });

    // İlgili tüm verileri sil
    await db.run('DELETE FROM payments WHERE customer_id = $1', [req.params.id]);
    await db.run('DELETE FROM calendar_entries WHERE customer_id = $1', [req.params.id]);
    await db.run('DELETE FROM shoots WHERE customer_id = $1', [req.params.id]);
    await db.run('DELETE FROM edit_counts WHERE customer_id = $1', [req.params.id]);
    await db.run('DELETE FROM customers WHERE id = $1', [req.params.id]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
