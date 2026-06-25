// image-optimizer.js — Alidea Asset Optimizasyon Motoru
// Core Web Vitals: LCP, CLS ve görsel bant genişliği optimizasyonu
// Kullanım: const { serveOptimizedImage, buildImgTag, buildVideoTag } = require('./image-optimizer');
'use strict';

const path  = require('path');
const fs    = require('fs');
const sharp = require('sharp');

const ROOT     = __dirname;
const CACHE_DIR = path.join(ROOT, '.img-cache');

// Önbellek dizini oluştur
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// ─── YAPILANDIRMA ─────────────────────────────────────────────────────────────

const CONFIG = {
  // Dönüştürme kaliteleri
  quality: {
    avif: 65,   // AVIF: en küçük boyut, mükemmel kalite
    webp: 80,   // WebP: evrensel destek, iyi sıkıştırma
    jpeg: 82,   // JPEG fallback
    png:  90,   // PNG: şeffaflık gerektiğinde
  },
  // Duyarlı (responsive) genişlik seti — srcset üretimi için
  widths: [320, 480, 768, 1024, 1280, 1600],
  // Tarayıcı önbellek süresi (saniye)
  cacheMaxAge: 60 * 60 * 24 * 30, // 30 gün
  // Desteklenen kaynak formatlar
  supportedSrc: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.tiff'],
};

// ─── FORMAT NEGOTIATION ───────────────────────────────────────────────────────
/**
 * Accept header'a göre en optimal çıktı formatını seçer.
 * AVIF > WebP > Orijinal format
 *
 * @param {string} acceptHeader - req.headers.accept
 * @param {string} srcExt       - Kaynak dosya uzantısı (örn. '.png')
 * @returns {'avif'|'webp'|'jpeg'|'png'}
 */
function negotiateFormat(acceptHeader, srcExt) {
  const accept = acceptHeader || '';
  if (accept.includes('image/avif')) return 'avif';
  if (accept.includes('image/webp')) return 'webp';
  // JPEG veya PNG olmayan kaynak → WebP'ye fall
  if (srcExt === '.png' || srcExt === '.gif') return 'webp';
  return 'jpeg';
}

// ─── ÖNBELLEK ANAHTARI ────────────────────────────────────────────────────────
function cacheKey(srcPath, width, format) {
  const base = path.basename(srcPath, path.extname(srcPath));
  return path.join(CACHE_DIR, `${base}_w${width || 'orig'}.${format}`);
}

// ─── GÖRSEL BOYUT OKUYUCU ─────────────────────────────────────────────────────
/**
 * Kaynaktan width/height meta verisini okur (sharp kullanarak).
 * CLS önleme için aspect-ratio ve dimensions gerektiren yerlerde kullanılır.
 *
 * @param {string} srcPath - Mutlak dosya yolu
 * @returns {Promise<{width: number, height: number, aspectRatio: string}>}
 */
async function getImageDimensions(srcPath) {
  try {
    const meta = await sharp(srcPath).metadata();
    const w = meta.width  || 0;
    const h = meta.height || 0;
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const d = gcd(w, h);
    return {
      width:       w,
      height:      h,
      aspectRatio: `${w / d} / ${h / d}`,   // CSS aspect-ratio değeri
    };
  } catch {
    return { width: 0, height: 0, aspectRatio: 'auto' };
  }
}

// ─── GÖRSEL OPTİMİZASYON MİDDLEWARE ─────────────────────────────────────────
/**
 * Express middleware — /img/* route'una bağlanır.
 * URL formatı: /img/filename.jpg?w=800&format=webp
 *
 * Otomatik:
 * - Accept header'a göre AVIF > WebP > JPEG format seçimi
 * - İstenen genişliğe resize (orantılı, upscale yok)
 * - Önbellek (CACHE_DIR) ile tekrar işlemi engelleme
 * - ETag ve Cache-Control header'ları
 *
 * @example
 * GET /img/ornek.png?w=800        → 800px WebP veya AVIF (Accept'e göre)
 * GET /img/ornek.png?w=400&fmt=webp → 400px zorunlu WebP
 */
async function serveOptimizedImage(req, res) {
  const filename = req.params[0] || req.params.file || '';
  const srcPath  = path.join(ROOT, filename);

  // Güvenlik: ROOT dışına çıkma
  if (!srcPath.startsWith(ROOT)) return res.status(403).end('Forbidden');
  // Güvenlik: .img-cache'e doğrudan erişim yok
  if (srcPath.startsWith(CACHE_DIR)) return res.status(403).end('Forbidden');

  const srcExt = path.extname(srcPath).toLowerCase();
  if (!CONFIG.supportedSrc.includes(srcExt)) return res.status(415).end('Unsupported');

  // Kaynak dosya var mı?
  if (!fs.existsSync(srcPath)) return res.status(404).end('Not Found');

  const targetWidth  = parseInt(req.query.w || req.query.width || '0', 10) || null;
  const forceFmt     = (req.query.fmt || req.query.format || '').toLowerCase();
  const outputFormat = ['avif','webp','jpeg','png'].includes(forceFmt)
    ? forceFmt
    : negotiateFormat(req.headers.accept, srcExt);

  const cached = cacheKey(srcPath, targetWidth, outputFormat);

  // ── Önbellekten sun ──────────────────────────────────────────────────────────
  if (fs.existsSync(cached)) {
    const data = fs.readFileSync(cached);
    res.setHeader('Content-Type', `image/${outputFormat}`);
    res.setHeader('Cache-Control', `public, max-age=${CONFIG.cacheMaxAge}, immutable`);
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Vary', 'Accept');
    return res.end(data);
  }

  // ── Sharp ile dönüştür ve önbellekle ─────────────────────────────────────────
  try {
    let pipeline = sharp(srcPath);

    if (targetWidth) {
      pipeline = pipeline.resize({
        width:   targetWidth,
        fit:     'inside',
        withoutEnlargement: true,  // Upscale yok → orijinalden büyütme
      });
    }

    switch (outputFormat) {
      case 'avif':
        pipeline = pipeline.avif({ quality: CONFIG.quality.avif, effort: 4 }); break;
      case 'webp':
        pipeline = pipeline.webp({ quality: CONFIG.quality.webp, effort: 4 }); break;
      case 'png':
        pipeline = pipeline.png({ quality: CONFIG.quality.png, compressionLevel: 8 }); break;
      default:
        pipeline = pipeline.jpeg({ quality: CONFIG.quality.jpeg, mozjpeg: true }); break;
    }

    const buf = await pipeline.toBuffer();
    fs.writeFileSync(cached, buf);

    res.setHeader('Content-Type', `image/${outputFormat}`);
    res.setHeader('Cache-Control', `public, max-age=${CONFIG.cacheMaxAge}, immutable`);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Vary', 'Accept');
    res.end(buf);
  } catch (err) {
    console.error('[image-optimizer] Sharp error:', err.message);
    // Fallback: orijinal dosyayı sun
    const mimeMap = { '.jpg':'.jpeg', '.jpeg':'jpeg', '.png':'png', '.gif':'gif' };
    res.setHeader('Content-Type', `image/${mimeMap[srcExt] || 'jpeg'}`);
    fs.createReadStream(srcPath).pipe(res);
  }
}

// ─── <img> TAG BUILDER ────────────────────────────────────────────────────────
/**
 * CLS-güvenli, lazy-loaded, responsive <img> HTML string'i üretir.
 *
 * @param {Object} opts
 * @param {string}  opts.src         - Görsel dosya adı (örn. 'ege_waffle_yeni.jpg')
 * @param {string}  opts.alt         - Erişilebilirlik metni (zorunlu)
 * @param {number}  [opts.width]     - Görüntü genişliği (px) — boyut biliniyorsa verilmeli
 * @param {number}  [opts.height]    - Görüntü yüksekliği (px)
 * @param {string}  [opts.aspectRatio] - CSS aspect-ratio (örn. '16 / 9')
 * @param {boolean} [opts.priority]  - true → LCP görseli: eager load + preload
 * @param {string}  [opts.sizes]     - srcset sizes niteliği (örn. '(max-width:768px) 100vw, 50vw')
 * @param {string}  [opts.className] - CSS class adı
 * @param {string}  [opts.style]     - Ek inline stil
 * @param {number[]} [opts.srcset]   - Üretilecek genişlik listesi (varsayılan: CONFIG.widths)
 * @returns {string} - Hazır HTML string
 *
 * @example
 * buildImgTag({ src: 'ege_waffle_yeni.jpg', alt: 'Ege Waffle', width: 1200, height: 800, priority: false })
 */
function buildImgTag(opts = {}) {
  const {
    src,
    alt = '',
    width,
    height,
    aspectRatio,
    priority = false,
    sizes    = '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw',
    className = '',
    style     = '',
    srcsetWidths = CONFIG.widths,
  } = opts;

  if (!src) return '<!-- OptimizedImage: src gerekli -->';

  const loading  = priority ? 'eager' : 'lazy';
  const decoding = priority ? 'sync'  : 'async';
  const fetchpriority = priority ? 'high' : 'low';

  // srcset üret: her genişlik için /img/<file>?w=<n> URL'i
  const srcsetEntries = srcsetWidths
    .map(w => `/img/${src}?w=${w} ${w}w`)
    .join(', ');

  // Boyut nitelikleri (CLS önleme)
  const widthAttr  = width  ? ` width="${width}"`   : '';
  const heightAttr = height ? ` height="${height}"` : '';

  // Aspect ratio: açık boyutlar yoksa style olarak ekle
  let styleAttr = style;
  if (aspectRatio && !width) {
    styleAttr = `aspect-ratio: ${aspectRatio}; ${style}`.trim();
  } else if (width && height && !aspectRatio) {
    // Boyutlardan otomatik hesapla
    styleAttr = `aspect-ratio: ${width} / ${height}; ${style}`.trim();
  }

  const classAttr = className ? ` class="${className}"` : '';
  const styleOut  = styleAttr ? ` style="${styleAttr}"` : '';

  return [
    `<picture>`,
    // AVIF source
    `  <source`,
    `    type="image/avif"`,
    `    srcset="${srcsetWidths.map(w => `/img/${src}?w=${w}&fmt=avif ${w}w`).join(', ')}"`,
    `    sizes="${sizes}" />`,
    // WebP source
    `  <source`,
    `    type="image/webp"`,
    `    srcset="${srcsetWidths.map(w => `/img/${src}?w=${w}&fmt=webp ${w}w`).join(', ')}"`,
    `    sizes="${sizes}" />`,
    // Fallback img
    `  <img`,
    `    src="/img/${src}?w=1280"`,
    `    srcset="${srcsetEntries}"`,
    `    sizes="${sizes}"`,
    `    alt="${alt}"`,
    `    loading="${loading}"`,
    `    decoding="${decoding}"`,
    `    fetchpriority="${fetchpriority}"`,
    widthAttr  ? `    width="${width}"` : '',
    heightAttr ? `    height="${height}"` : '',
    classAttr  ? `    class="${className}"` : '',
    styleOut   ? `    style="${styleAttr}"` : '',
    `  />`,
    `</picture>`,
  ].filter(Boolean).join('\n');
}

// ─── <video> TAG BUILDER ──────────────────────────────────────────────────────
/**
 * Lazy-loaded, CLS-güvenli <video> HTML string'i üretir.
 * Otomatik: poster image, aspect-ratio, playsinline (mobil uyumluluk).
 *
 * @param {Object} opts
 * @param {string}  opts.src          - Video dosyası (örn. 'hero-bg.mp4')
 * @param {string}  [opts.poster]     - Poster görseli (boş frame göstermemek için)
 * @param {number}  [opts.width]      - Genişlik (px)
 * @param {number}  [opts.height]     - Yükseklik (px)
 * @param {string}  [opts.aspectRatio] - CSS aspect-ratio (örn. '16 / 9')
 * @param {boolean} [opts.autoplay]   - Otomatik oynat (muted ile birlikte)
 * @param {boolean} [opts.loop]       - Döngü
 * @param {boolean} [opts.muted]      - Sessiz (autoplay gerektirir)
 * @param {boolean} [opts.priority]   - true → LCP videosu: preload="auto"
 * @param {string}  [opts.className]
 * @returns {string}
 */
function buildVideoTag(opts = {}) {
  const {
    src,
    poster,
    width,
    height,
    aspectRatio = '16 / 9',
    autoplay    = false,
    loop        = false,
    muted       = true,
    priority    = false,
    className   = '',
    style       = '',
  } = opts;

  if (!src) return '<!-- OptimizedVideo: src gerekli -->';

  const preloadVal  = priority ? 'auto' : 'none';   // LCP için auto, diğerleri none
  const widthAttr   = width  ? ` width="${width}"`   : '';
  const heightAttr  = height ? ` height="${height}"` : '';
  const autoplayAttr = autoplay ? ' autoplay' : '';
  const loopAttr    = loop    ? ' loop'     : '';
  const mutedAttr   = muted   ? ' muted'   : '';
  const posterAttr  = poster  ? ` poster="/img/${poster}?w=1280&fmt=webp"` : '';
  const classAttr   = className ? ` class="${className}"` : '';

  // Aspect ratio stil — CLS önleme
  let styleVal = `aspect-ratio: ${aspectRatio}; ${style}`.trim();
  if (width && height) styleVal = `aspect-ratio: ${width} / ${height}; ${style}`.trim();

  return [
    `<video`,
    `  preload="${preloadVal}"`,
    `  playsinline`,
    widthAttr, heightAttr, autoplayAttr, loopAttr, mutedAttr, posterAttr, classAttr,
    `  style="${styleVal}"`,
    `>`,
    `  <source src="${src}" type="video/mp4" />`,
    `  <p>Tarayıcınız video oynatmayı desteklemiyor.</p>`,
    `</video>`,
  ].filter(Boolean).join('\n');
}

// ─── LCP PRELOAD TAG BUILDER ──────────────────────────────────────────────────
/**
 * Above-the-fold (LCP) görsel için <link rel="preload"> HTML string'i üretir.
 * seo-utils.js buildHeadTags() ile birlikte <head>'e inject edilir.
 *
 * @param {string} src    - Görsel dosya adı (örn. 'alidea_logo.png')
 * @param {string} [sizes] - imagesizes niteliği
 * @returns {string}
 */
function buildPreloadTag(src, sizes = '(max-width: 768px) 100vw, 50vw') {
  const srcsetWidths = CONFIG.widths;
  const avifSrcset = srcsetWidths.map(w => `/img/${src}?w=${w}&fmt=avif ${w}w`).join(', ');
  const webpSrcset = srcsetWidths.map(w => `/img/${src}?w=${w}&fmt=webp ${w}w`).join(', ');

  return [
    `<!-- LCP Preload: ${src} -->`,
    `<link rel="preload" as="image"`,
    `  href="/img/${src}?w=1280&fmt=avif"`,
    `  imagesrcset="${avifSrcset}"`,
    `  imagesizes="${sizes}"`,
    `  type="image/avif" />`,
    `<link rel="preload" as="image"`,
    `  href="/img/${src}?w=1280&fmt=webp"`,
    `  imagesrcset="${webpSrcset}"`,
    `  imagesizes="${sizes}"`,
    `  type="image/webp" />`,
  ].join('\n');
}

// ─── ÖNBELLEK TEMİZLEYİCİ ────────────────────────────────────────────────────
/**
 * .img-cache dizinindeki dosyaları temizler.
 * Yeni görsel yüklendiğinde veya deployment sonrasında çağrılabilir.
 */
function clearImageCache() {
  if (!fs.existsSync(CACHE_DIR)) return;
  const files = fs.readdirSync(CACHE_DIR);
  files.forEach(f => fs.unlinkSync(path.join(CACHE_DIR, f)));
  console.log(`[image-optimizer] Önbellek temizlendi: ${files.length} dosya silindi.`);
}

// ─── GÖRSEL ENVANTER TARAYICI ─────────────────────────────────────────────────
/**
 * ROOT dizinindeki tüm görsellerin boyut bilgilerini toplar.
 * Geliştirme sırasında width/height değerlerini öğrenmek için kullanılır.
 *
 * @returns {Promise<Array<{file, width, height, sizeKB, aspectRatio}>>}
 */
async function scanImageInventory() {
  const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
  const results = [];

  const files = fs.readdirSync(ROOT).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return extensions.includes(ext);
  });

  for (const file of files) {
    const filePath = path.join(ROOT, file);
    const stat = fs.statSync(filePath);
    const dims = await getImageDimensions(filePath);
    results.push({
      file,
      width:  dims.width,
      height: dims.height,
      aspectRatio: dims.aspectRatio,
      sizeKB: Math.round(stat.size / 1024),
    });
  }

  return results;
}

module.exports = {
  serveOptimizedImage,
  buildImgTag,
  buildVideoTag,
  buildPreloadTag,
  getImageDimensions,
  clearImageCache,
  scanImageInventory,
  CONFIG,
};
