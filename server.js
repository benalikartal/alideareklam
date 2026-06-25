// server.js — Alidea Medya | Güvenli Express Sunucusu
'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const cors         = require('cors');
const path         = require('path');
const fs           = require('fs');
const jwt          = require('jsonwebtoken');
const { buildSitemap, buildRobotsTxt, toCanonical, buildHeadTags } = require('./seo-utils');


const app  = express();
const PORT = process.env.PORT || 3005;

// ─── GÜVENLİK MIDDLEWARE'LERİ ─────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // HTML'ler inline script kullanıyor, geçici olarak kapalı
}));

app.use(cors({ origin: false })); // Aynı origin dışından erişim yok
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── KORUNAN HTML SAYFALARI ───────────────────────────────────────────────────
// Bu sayfalar token olmadan açılamaz — URL'ye yazılsa bile login'e yönlendirir

const ADMIN_ONLY_PAGES = [
  '/admin-dashboard.html',
  '/messages-dashboard.html',
];

const AUTH_REQUIRED_PAGES = [
  '/special-customer-dashboard.html',
  '/special-customer-payments.html',
  '/demo-dashboard.html',
];

// Bu eski giriş sayfaları artık kullanılmıyor — tek giriş noktası admin-login.html
const DEPRECATED_LOGIN_PAGES = [
  '/special-customer-login.html',
  '/messages-login.html',
];

function verifyToken(req) {
  const token = req.cookies && req.cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Admin sayfaları koruma
app.use((req, res, next) => {
  if (ADMIN_ONLY_PAGES.includes(req.path)) {
    const user = verifyToken(req);
    if (!user || user.role !== 'admin') {
      res.clearCookie('token');
      return res.redirect('/admin-login.html');
    }
  }
  next();
});

// Auth gerektiren sayfalar (müşteri + admin)
app.use((req, res, next) => {
  if (AUTH_REQUIRED_PAGES.includes(req.path)) {
    const user = verifyToken(req);
    if (!user) {
      res.clearCookie('token');
      return res.redirect('/admin-login.html');
    }
    // Müşteri admin dashboarduna giremez
    if (user.role === 'customer' && req.path === '/admin-dashboard.html') {
      return res.redirect('/special-customer-dashboard.html');
    }
  }
  // Eski giriş sayfaları → tek giriş noktasına yönlendir
  if (DEPRECATED_LOGIN_PAGES.includes(req.path)) {
    return res.redirect('/admin-login.html');
  }
  next();
});

// ─── API ROUTE'LARI ───────────────────────────────────────────────────────────

const authRoutes      = require('./backend/routes/auth');
const customerRoutes  = require('./backend/routes/customers');
const paymentRoutes   = require('./backend/routes/payments');
const calendarRoutes  = require('./backend/routes/calendar');
const shootRoutes     = require('./backend/routes/shoots');

app.use('/api/auth',      authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/calendar',  calendarRoutes);
app.use('/api/shoots',    shootRoutes);

// ─── GEO: AI / LLM SUMMARY ENDPOINT ─────────────────────────────────────────
// GPTBot, ClaudeBot, Perplexity vb. bu endpoint'i okuyarak ajans bilgilerini çeker.
// Accept: application/json → JSON formatında; aksi halde text/plain (Markdown).

app.get('/api/ai-summary', (req, res) => {
  const llmsPath = path.join(__dirname, 'llms.txt');
  fs.readFile(llmsPath, 'utf8', (err, content) => {
    if (err) return res.status(500).json({ error: 'llms.txt okunamadı.' });

    const acceptsJson = (req.headers['accept'] || '').includes('application/json');

    if (acceptsJson) {
      // JSON formatında yapılandırılmış yanıt
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 saat önbellek
      return res.json({
        source: 'Alidea llms.txt',
        version: '1.0',
        url: 'https://alidea.com.tr/llms.txt',
        format: 'markdown',
        language: 'tr',
        content
      });
    }

    // Düz Markdown — LLM botlarının tercih ettiği format
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(content);
  });
});


// ─── SEO: DİNAMİK SİTEMAP.XML ────────────────────────────────────────────────
// Google, Bing ve yapay zeka tarayıcıları bu endpoint'i tüm URL envanteri için okur.

app.get('/sitemap.xml', (req, res) => {
  const xml = buildSitemap();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 saatte bir tazele
  res.send(xml);
});

// ─── SEO: DİNAMİK ROBOTS.TXT ─────────────────────────────────────────────────
// Hangi botun neyi tarayabileceğini ve llms.txt erişim iznini tanımlar.

app.get('/robots.txt', (req, res) => {
  const txt = buildRobotsTxt();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 saat
  res.send(txt);
});


// ─── STATİK DOSYALAR ──────────────────────────────────────────────────────────

const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.pdf':  'application/pdf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

// Güvenlik: backend/ ve data/ klasörlerine doğrudan erişim yasak
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.startsWith('/backend/') || p.startsWith('/data/') || p === '/.env' || p.endsWith('.db')) {
    return res.status(403).end('Forbidden');
  }
  next();
});

// Statik dosya sunucusu (video range desteğiyle)
app.get('/{*path}', (req, res) => {
  let urlPath = req.path;
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  // Path traversal koruması
  if (!filePath.startsWith(ROOT)) return res.status(403).end('Forbidden');

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).send('<h1>404 — Sayfa Bulunamadı</h1><a href="/">Ana Sayfaya Dön</a>');
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    // ── HTML dosyaları: tam SEO + OG + Twitter head tag inject ─────────────────
    if (ext === '.html') {
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.status(500).end('Internal Server Error');

        // Sayfa path'ini normalize et (/index.html gibi)
        const relativePath = '/' + path.relative(ROOT, filePath).replace(/\\/g, '/');

        // buildHeadTags: title + desc + canonical + OG + Twitter Card blogu
        const { metaBlock } = buildHeadTags(relativePath, req.query);

        let output = html;

        // 1. Mevcut <title> tag'ini yenisiyle replace et
        output = output.replace(/<title>[^<]*<\/title>/i, '');

        // 2. Mevcut <meta name="description"...> tag'ini temizle
        output = output.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');

        // 3. Mevcut <link rel="canonical"...> tag'ini temizle
        output = output.replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '');

        // 4. Mevcut OG tag'lerini temizle (varsa)
        output = output.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '');

        // 5. Mevcut Twitter tag'lerini temizle (varsa)
        output = output.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');

        // 6. Tam SEO bloğunu </head>'den hemen önce inject et
        output = output.replace('</head>', `${metaBlock}\n</head>`);

        res.writeHead(200, { 'Content-Type': mime });
        res.end(output);
      });
      return;
    }

    // Video/PDF için range desteği
    if (ext === '.mp4' || ext === '.pdf') {
      const fileSize    = stats.size;
      const rangeHeader = req.headers['range'];
      if (rangeHeader) {
        const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
        const start     = parseInt(startStr, 10);
        const end       = endStr ? parseInt(endStr, 10) : fileSize - 1;
        res.writeHead(206, {
          'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges':  'bytes',
          'Content-Length': end - start + 1,
          'Content-Type':   mime,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': mime, 'Accept-Ranges': 'bytes' });
        fs.createReadStream(filePath).pipe(res);
      }
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) return res.status(500).end('Internal Server Error');
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });
  });
});

// ─── BAŞLAT ───────────────────────────────────────────────────────────────────

// Veritabanını başlat (seed dahil)
require('./backend/db');

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log('');
    console.log('  ✅  Alidea Medya Sunucusu Başlatıldı!');
    console.log('');
    console.log(`  🌐  Site          →  http://localhost:${PORT}`);
    console.log(`  🔐  Admin Girişi  →  http://localhost:${PORT}/admin-login.html`);
    console.log(`  📊  Admin Panel   →  http://localhost:${PORT}/admin-dashboard.html`);
    console.log('');
    console.log('  ⚠️   admin-dashboard.html direkt açılamaz — giriş gerekir');
    console.log('  🔒  Şifreler .env dosyasında, kaynak kodda görünmez');
    console.log('');
    console.log('  Durdurmak için Ctrl+C');
    console.log('');
  });
}

module.exports = app;
