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

// ─── PAGE META VERİ TABLOSU ──────────────────────────────────────────────────
/**
 * Her public sayfa için SEO ve sosyal medya meta verisi.
 *
 * title       : Tam <title> değeri — "Sayfa | Alidea Reklam ve Yazılım Ajansı" formatı
 *               60-65 karakter arası hedeflenmiştir.
 * description : Meta description — 150-160 karakter sınırı uygulanır (buildHeadTags içinde).
 * ogType      : 'website' | 'article' | 'product'
 * ogImage     : Sosyal medyada paylaşım görseli (1200×630 px önerilir)
 * twitterCard : 'summary_large_image' | 'summary'
 * keywords    : <meta name="keywords"> için anahtar kelime listesi
 */
const BRAND_SUFFIX = 'Alidea Reklam ve Yazılım Ajansı';
const DEFAULT_OG_IMAGE = `${BASE_URL}/alidea_logo.png`;

const PAGE_META = {

  // ── Ana Sayfa ───────────────────────────────────────────────────────────────
  '/index.html': {
    title: `Ana Sayfa | ${BRAND_SUFFIX}`,
    description: 'Markanızı yükseltmek için üst düzey stratejiyi kusursuz mühendislikle harmanlayan Türkiye\'nin yenilikçi dijital reklam ve yazılım inovasyon merkezi.',
    ogType: 'website',
    ogImage: `${BASE_URL}/alidea_logo.png`,
    twitterCard: 'summary_large_image',
    keywords: 'dijital ajans, reklam ajansı, yazılım geliştirme, 3D modelleme, video prodüksiyon, Türkiye',
  },

  // ── Portföy (Case Studies) ──────────────────────────────────────────────────
  '/portfolio.html': {
    title: `Portföy — Seçilmiş İşler | ${BRAND_SUFFIX}`,
    description: '20M+ organik izlenme ve 50+ marka ile iş birliği. Ege Waffle, Zulu Coffee, Cakelab ve daha fazlası için ürettiğimiz kreatif çalışmalar.',
    ogType: 'website',
    ogImage: `${BASE_URL}/ornek.png`,           // Portföy kapak görseli
    twitterCard: 'summary_large_image',
    keywords: 'portföy, referanslar, kreatif çalışmalar, video prodüksiyon, sosyal medya içerikleri',
  },

  // ── Iarone (Proje / Case Study) ─────────────────────────────────────────────
  '/iarone.html': {
    title: `Iarone — 2D\'den 3D/AR\'a SaaS Platformu | ${BRAND_SUFFIX}`,
    description: 'Tek bir 2D görüntüden gerçek zamanlı 3D/AR modeli üreten tarayıcı tabanlı SaaS. Three.js WebGL motoru, sıfır kurulum, tüm cihaz desteği.',
    ogType: 'product',
    ogImage: `${BASE_URL}/png_alidea.png`,      // Iarone proje kapak görseli
    twitterCard: 'summary_large_image',
    keywords: 'Iarone, 3D modelleme, AR uygulama, SaaS, Three.js, WebGL, e-ticaret 3D',
  },

  // ── Websitesgo (Proje / Case Study) ─────────────────────────────────────────
  '/websitesgo.html': {
    title: `Websitesgo — Kurumsal Web ve E-Ticaret Altyapısı | ${BRAND_SUFFIX}`,
    description: 'Core Web Vitals optimize, Lighthouse 90+ skorlu kurumsal siteler ve e-ticaret platformları. SEO-first mimari, JSON-LD ve CDN dahil.',
    ogType: 'product',
    ogImage: `${BASE_URL}/png_websitesgo.png`,  // Websitesgo proje kapak görseli
    twitterCard: 'summary_large_image',
    keywords: 'Websitesgo, web geliştirme, e-ticaret, kurumsal site, Core Web Vitals, SEO',
  },

  // ── Ekip ────────────────────────────────────────────────────────────────────
  '/team.html': {
    title: `Ekibimiz | ${BRAND_SUFFIX}`,
    description: 'Tasarım, mühendislik ve kreatif prodüksiyonu tek çatı altında buluşturan Alidea ekibini tanıyın. İnovasyon merkezimizin arkasındaki insanlar.',
    ogType: 'website',
    ogImage: `${BASE_URL}/alidea_logo.png`,
    twitterCard: 'summary_large_image',
    keywords: 'Alidea ekip, dijital ajans ekibi, yazılım mühendisleri, kreatif direktör',
  },

  // ── Referans: Ege Waffle (Case Study) ───────────────────────────────────────
  '/referans/ege-waffle': {
    title: `Ege Waffle — Marka Yolculuğu | ${BRAND_SUFFIX}`,
    description: 'Ege Waffle için üretilen sosyal medya içerikleri, video kurgu ve marka görselleri. Alidea\'nın kreatif prodüksiyon sürecine bakış.',
    ogType: 'article',
    ogImage: `${BASE_URL}/ege_waffle_yeni.jpg`, // Proje kapak görseli (thumbnail)
    twitterCard: 'summary_large_image',
    keywords: 'Ege Waffle, marka yolculuğu, sosyal medya içeriği, kreatif prodüksiyon',
  },

  // ── Referans: Zulu Coffee (Case Study) ──────────────────────────────────────
  '/referans/zulu-coffee': {
    title: `Zulu Coffee — Marka Kimliği | ${BRAND_SUFFIX}`,
    description: 'Zulu Coffee için sosyal medya görsel kimliği, video içerik üretimi ve marka estetiği geliştirme süreci.',
    ogType: 'article',
    ogImage: `${BASE_URL}/zulucoffe.png`,
    twitterCard: 'summary_large_image',
    keywords: 'Zulu Coffee, marka kimliği, kahve markası, sosyal medya tasarımı',
  },

  // ── Referans: Cakelab (Case Study) ──────────────────────────────────────────
  '/referans/cakelab-by-alpnar': {
    title: `Cakelab by Alpnar — Dijital Dönüşüm | ${BRAND_SUFFIX}`,
    description: 'Cakelab by Alpnar için sosyal medya içerik stratejisi, ürün fotoğrafçılığı ve video prodüksiyon hizmetleri.',
    ogType: 'article',
    ogImage: `${BASE_URL}/cakelabbyalpnar.jpg`,
    twitterCard: 'summary_large_image',
    keywords: 'Cakelab, Alpnar, pastane markası, içerik üretimi, sosyal medya',
  },

  // ── Referans: Cafeinn (Case Study) ──────────────────────────────────────────
  '/referans/cafeinn': {
    title: `Cafeinn — Dijital Strateji | ${BRAND_SUFFIX}`,
    description: 'Cafeinn için üretilen dijital reklam kampanyaları ve sosyal medya içerikleri. Alidea kreatif yaklaşımı.',
    ogType: 'article',
    ogImage: `${BASE_URL}/cafeinnpng.jpg`,
    twitterCard: 'summary_large_image',
    keywords: 'Cafeinn, kafe markası, dijital reklam, Instagram içeriği',
  },

};

// ─── DESCRIPTION KISALTICI ───────────────────────────────────────────────────
/**
 * Description'ı 155 karaktere kısaltır, kelime ortasında kesmez.
 * @param {string} desc
 * @returns {string}
 */
function trimDescription(desc) {
  if (!desc || desc.length <= 155) return desc;
  const cut = desc.substring(0, 155).lastIndexOf(' ');
  return desc.substring(0, cut > 100 ? cut : 152) + '…';
}

// ─── HEAD TAG BUILDER ─────────────────────────────────────────────────────────
/**
 * Verilen dosya path'i için eksiksiz SEO + OG + Twitter Card tag bloğunu üretir.
 * Sunucu tarafında HTML string'e inject edilmek üzere tasarlanmıştır.
 *
 * @param {string} filePath   - '/' ile başlayan path (örn. '/iarone.html')
 * @param {string} [reqQuery] - Querystring (proje thumbnail dinamik override için)
 * @returns {{ title: string, metaBlock: string, meta: Object }}
 */
function buildHeadTags(filePath, reqQuery) {
  // Normalize: .html ile veya .html olmadan arama yap
  const normalizedPath = filePath.replace(/\.html$/i, '');
  const meta =
    PAGE_META[filePath] ||
    PAGE_META[normalizedPath + '.html'] ||
    PAGE_META[normalizedPath] ||
    null;

  // Fallback değerler
  const title       = meta?.title       || `${BRAND_SUFFIX}`;
  const rawDesc     = meta?.description || 'Markanızı yükseltmek için üst düzey stratejiyi kusursuz mühendislikle harmanlayan dijital reklam ve yazılım ajansı.';
  const description = trimDescription(rawDesc);
  const ogType      = meta?.ogType      || 'website';
  const twitterCard = meta?.twitterCard || 'summary_large_image';
  const keywords    = meta?.keywords    || 'dijital ajans, yazılım, reklam, Türkiye';

  // OG image: querystring override > sayfa tanımı > varsayılan logo
  const ogImage = (reqQuery && reqQuery.thumbnail)
    ? `${BASE_URL}/${reqQuery.thumbnail}`
    : (meta?.ogImage || DEFAULT_OG_IMAGE);

  const canonicalUrl = toCanonical(filePath);

  const tags = [
    `    <title>${title}</title>`,
    `    <meta name="description" content="${description}" />`,
    `    <meta name="keywords" content="${keywords}" />`,
    `    <meta name="author" content="Alidea" />`,
    `    <meta name="robots" content="index, follow" />`,
    `    <link rel="canonical" href="${canonicalUrl}" />`,
    ``,
    `    <!-- Open Graph / Facebook / WhatsApp / LinkedIn -->`,
    `    <meta property="og:type"        content="${ogType}" />`,
    `    <meta property="og:url"         content="${canonicalUrl}" />`,
    `    <meta property="og:title"       content="${title}" />`,
    `    <meta property="og:description" content="${description}" />`,
    `    <meta property="og:image"       content="${ogImage}" />`,
    `    <meta property="og:image:width"  content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta property="og:locale"      content="tr_TR" />`,
    `    <meta property="og:site_name"   content="Alidea" />`,
    ``,
    `    <!-- Twitter Card -->`,
    `    <meta name="twitter:card"        content="${twitterCard}" />`,
    `    <meta name="twitter:site"        content="@alideaofficial" />`,
    `    <meta name="twitter:creator"     content="@alideaofficial" />`,
    `    <meta name="twitter:title"       content="${title}" />`,
    `    <meta name="twitter:description" content="${description}" />`,
    `    <meta name="twitter:image"       content="${ogImage}" />`,
  ].join('\n');

  return { title, description, ogImage, canonicalUrl, metaBlock: tags };
}

module.exports = {
  toSlug,
  toCanonical,
  buildSitemap,
  buildRobotsTxt,
  buildHeadTags,
  trimDescription,
  SITEMAP_PAGES,
  PAGE_META,
  BASE_URL,
  BRAND_SUFFIX,
};
