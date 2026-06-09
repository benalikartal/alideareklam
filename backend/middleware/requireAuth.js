// backend/middleware/requireAuth.js
'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT doğrulama middleware'i.
 * Cookie'deki 'token' değerini doğrular.
 * Başarılıysa req.user'a payload'ı yazar.
 */
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    // API isteği mi, sayfa isteği mi?
    if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    }
    return res.redirect('/admin-login.html');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    res.clearCookie('token');
    if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
      return res.status(401).json({ error: 'Oturum süresi doldu.' });
    }
    return res.redirect('/admin-login.html');
  }
}

/**
 * Sadece admin rolüne izin verir.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    return res.redirect('/admin-login.html');
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
