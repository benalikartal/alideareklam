// seo-utils.js — Alidea SEO Yardımcı Fonksiyonları
// Kullanım: const { toSlug, toCanonical, buildSitemap } = require('./seo-utils');
'use strict';

const BASE_URL = process.env.SITE_URL || 'https://alidea.com.tr';

// ─── URL SLUG FORMATLAYICI ────────────────────────────────────────────────────
/**
 * Türkçe karakterleri ASCII karşılıklarına dönüştürür, küçük harfe çevirir
 * ve URL-güvenli slug üretir.
 *
 * @param {string} text - Herhangi bir metin (Türkçe dahil)
 * @returns {string}    - Slug (örn. "Çalışmalar" → "calismalar")
 *
 * @example
 * toSlug('Kreatif Prodüksiyon & Tasarım') // → 'kreatif-produksiyon-tasarim'
 * toSlug('İnovasyon Merkezi')              // → 'inovasyon-merkezi'
 */
function toSlug(text) {
  if (!text || typeof text !== 'string') return '';

  const TR_MAP = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i',
    'İ': 'i', 'i': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u',
  };

  return text
    .split('')
    .map(ch => TR_MAP[ch] ?? ch)       // Türkçe karakterleri dönüştür
    .join('')
    .toLowerCase()                      // Küçük harfe çevir
    .replace(/[^a-z0-9\s-]/g, '')      // Harf/rakam/boşluk/tire dışındakileri sil
    .trim()
    .replace(/\s+/g, '-')              // Boşlukları tire yap
    .replace(/-{2,}/g, '-');           // Çift tireleri teke indir
}

// ─── CANONICAL URL ÜRETİCİ ───────────────────────────────────────────────────
/**
 * Verilen path veya .html dosya adından tam canonical URL üretir.
 *
 * @param {string} pathOrFile - '/iarone.html', 'portfolio.html', '/hizmetler' vb.
 * @returns {string}          - Tam canonical URL
 *
 * @example
 * toCanonical('/iarone.html')    // → 'https://alidea.com.tr/iarone'
 * toCanonical('portfolio.html')  // → 'https://alidea.com.tr/portfolio'
 * toCanonical('/')               // → 'https://alidea.com.tr/'
 */
function toCanonical(pathOrFile) {
  if (!pathOrFile) return BASE_URL + '/';

  let p = pathOrFile.trim();

  // Başa / ekle
  if (!p.startsWith('/')) p = '/' + p;

  // Ana sayfa kontrolü
  if (p === '/' || p === '/index.html' || p === '/index') {
    return BASE_URL + '/';
  }

  // .html uzantısını kaldır
  p = p.replace(/\.html$/i, '');

  return BASE_URL + p;
}

// ─── SİTEMAP SAYFA TANIMLARI ─────────────────────────────────────────────────
/**
 * Sitemap'e dahil edilecek public sayfalar.
 * Yeni sayfa eklendiğinde buraya eklenir; endpoint ve HTML canonical otomatik güncellenir.
 *
 * priority  : 0.0 – 1.0 (Google öncelik sinyali)
 * changefreq: always | hourly | daily | weekly | monthly | yearly | never
 */
const SITEMAP_PAGES = [
  {
    path: '/',
    slug: '',
    title: 'Ana Sayfa — Alidea Dijital Reklam ve Yazılım',
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    path: '/portfolio',
    slug: 'portfolio',
    title: 'Portföy — Seçilmiş İşler',
    priority: '0.9',
    changefreq: 'weekly',
  },
  {
    path: '/iarone',
    slug: 'iarone',
    title: 'Iarone — AI Destekli 3D/AR Ticaret Platformu',
    priority: '0.9',
    changefreq: 'monthly',
  },
  {
    path: '/websitesgo',
    slug: 'websitesgo',
    title: 'Websitesgo — E-Ticaret ve Kurumsal Web Çözümleri',
    priority: '0.85',
    changefreq: 'monthly',
  },
  {
    path: '/team',
    slug: 'team',
    title: 'Ekibimiz — Alidea',
    priority: '0.7',
    changefreq: 'monthly',
  },
  // ── Hizmet Alt Sayfaları (slug tabanlı, gelecekte genişletilebilir) ──
  {
    path: '/hizmetler/kreatif-produksiyon',
    slug: 'hizmetler/kreatif-produksiyon',
    title: 'Kreatif Prodüksiyon ve Dijital Tasarım — Alidea',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/hizmetler/yazilim-inovasyon',
    slug: 'hizmetler/yazilim-inovasyon',
    title: 'Yazılım ve İnovasyon Merkezi — Alidea',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/hizmetler/web-gelistirme',
    slug: 'hizmetler/web-gelistirme',
    title: 'Özel Web Sitesi Geliştirme (Websitesgo) — Alidea',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/hizmetler/dijital-reklam',
    slug: 'hizmetler/dijital-reklam',
    title: 'Dijital Reklam ve Strateji — Alidea',
    priority: '0.75',
    changefreq: 'monthly',
  },
  // ── Blog / İçerik Sayfaları (slug tabanlı) ──
  {
    path: '/blog/iarone-nasil-calisir',
    slug: 'blog/iarone-nasil-calisir',
    title: 'Iarone Nasıl Çalışır? 2D\'den 3D\'ye Dönüşüm Rehberi — Alidea Blog',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/blog/mogrt-otomasyon-premiere-pro',
    slug: 'blog/mogrt-otomasyon-premiere-pro',
    title: 'MOGRT ile Premiere Pro Otomasyonu: %60 Zaman Tasarrufu — Alidea Blog',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/blog/core-web-vitals-seo-rehberi',
    slug: 'blog/core-web-vitals-seo-rehberi',
    title: 'Core Web Vitals Nedir? SEO İçin Teknik Rehber — Alidea Blog',
    priority: '0.65',
    changefreq: 'monthly',
  },
];

// ─── SİTEMAP XML ÜRETİCİ ─────────────────────────────────────────────────────
/**
 * SITEMAP_PAGES listesinden geçerli tarihle XML string üretir.
 *
 * @returns {string} - Tam sitemap.xml içeriği
 */
function buildSitemap() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const urlBlocks = SITEMAP_PAGES.map(page => {
    const loc = BASE_URL + page.path;
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${page.changefreq}</changefreq>`,
      `    <priority>${page.priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset',
    '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
    '    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
    '',
    urlBlocks,
    '',
    '</urlset>',
  ].join('\n');
}

// ─── ROBOTS.TXT ÜRETİCİ ──────────────────────────────────────────────────────
/**
 * Dinamik robots.txt içeriği üretir.
 * Admin/dashboard sayfaları ve API uç noktaları taranmaz olarak işaretlenir.
 *
 * @returns {string}
 */
function buildRobotsTxt() {
  return [
    '# robots.txt — Alidea (https://alidea.com.tr)',
    '# Otomatik üretildi: seo-utils.js',
    '',
    '# ── Genel tarayıcılar ──────────────────────────────────────────────────────',
    'User-agent: *',
    'Allow: /',
    '',
    '# Korumalı ve indekslenmemesi gereken sayfalar',
    'Disallow: /admin-login.html',
    'Disallow: /admin-dashboard.html',
    'Disallow: /admin.html',
    'Disallow: /messages-dashboard.html',
    'Disallow: /messages-login.html',
    'Disallow: /special-customer-dashboard.html',
    'Disallow: /special-customer-login.html',
    'Disallow: /special-customer-payments.html',
    'Disallow: /demo-dashboard.html',
    'Disallow: /api/',
    'Disallow: /backend/',
    'Disallow: /data/',
    'Disallow: /.env',
    '',
    '# ── Yapay zeka botları (LLM/RAG) — llms.txt okuma izni ────────────────────',
    'User-agent: GPTBot',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /api/ai-summary',
    'Disallow: /admin-login.html',
    'Disallow: /admin-dashboard.html',
    'Disallow: /admin.html',
    'Disallow: /api/',
    'Allow: /api/ai-summary',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /api/ai-summary',
    'Disallow: /admin-login.html',
    'Disallow: /admin-dashboard.html',
    'Disallow: /api/',
    'Allow: /api/ai-summary',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /api/ai-summary',
    'Disallow: /admin-login.html',
    'Disallow: /admin-dashboard.html',
    'Disallow: /api/',
    'Allow: /api/ai-summary',
    '',
    'User-agent: anthropic-ai',
    'Allow: /',
    'Allow: /llms.txt',
    '',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
    '# ── Sitemap konumu ─────────────────────────────────────────────────────────',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}

module.exports = { toSlug, toCanonical, buildSitemap, buildRobotsTxt, SITEMAP_PAGES, BASE_URL };
