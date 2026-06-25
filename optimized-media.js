// optimized-media.js — Alidea Client-Side Asset Progressive Loading
// Core Web Vitals: LCP, CLS, INP optimizasyonu
// Bu dosya tüm sayfalardan önce yüklenir (script.js ile birlikte)
'use strict';

// ─── 1. LAZY IMAGE OBSERVER ───────────────────────────────────────────────────
// IntersectionObserver ile görünür alana giren görseller gerçek src'ye geçer.
// Golden Tricks: blur-up efekti ile pürüzsüz geçiş animasyonu.

(function initLazyImages() {
  // data-src niteliği olan görseller lazy-load havuzuna girer
  const lazyImages = document.querySelectorAll('img[data-src], source[data-srcset]');
  if (!lazyImages.length) return;

  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el = entry.target;

      if (el.tagName === 'SOURCE' && el.dataset.srcset) {
        el.srcset = el.dataset.srcset;
        delete el.dataset.srcset;
      }

      if (el.tagName === 'IMG') {
        if (el.dataset.src) {
          // Blur-up: önce blur'lu placeholder göster
          el.style.filter   = 'blur(8px)';
          el.style.transition = 'filter 0.4s ease';

          const tempImg = new Image();
          tempImg.onload = () => {
            el.src = el.dataset.src;
            if (el.dataset.srcset) el.srcset = el.dataset.srcset;
            // Blur kaldır — Golden Tricks smooth reveal
            requestAnimationFrame(() => {
              el.style.filter = 'none';
            });
          };
          tempImg.src = el.dataset.src;
          delete el.dataset.src;
        }
      }

      observer.unobserve(el);
    });
  }, {
    rootMargin: '200px 0px', // Görünmeden 200px önce yüklemeye başla
    threshold: 0,
  });

  lazyImages.forEach(el => io.observe(el));
})();


// ─── 2. VIDEO LAZY LOADER ─────────────────────────────────────────────────────
// preload="none" olan videolar görünür alana girince yüklenmeye başlar.
// LCP dışındaki videolar bant genişliği tüketmez.

(function initLazyVideos() {
  const lazyVideos = document.querySelectorAll('video[data-autoplay]');
  if (!lazyVideos.length) return;

  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        // Kaynakları yükle
        video.querySelectorAll('source[data-src]').forEach(source => {
          source.src = source.dataset.src;
          delete source.dataset.src;
        });
        video.load();
        video.play().catch(() => {}); // Autoplay policy hatalarını sessizce geç
        observer.unobserve(video);
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.25 });

  lazyVideos.forEach(v => io.observe(v));
})();


// ─── 3. CLS GUARD — Görsel Boyut Koruyucu ────────────────────────────────────
// width/height veya aspect-ratio eksik görsellere otomatik placeholder boyutu ekler.
// Bu, sunucu tarafında boyut bilinmiyorsa son savunma hattıdır.

(function initClsGuard() {
  const imgs = document.querySelectorAll('img:not([width]):not([data-cls-exempt])');

  imgs.forEach(img => {
    // Görsel zaten yüklüyse kontrol et
    if (img.complete && img.naturalWidth) {
      if (!img.style.aspectRatio) {
        img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      }
      return;
    }

    // Yüklenince aspect-ratio'yu ata
    img.addEventListener('load', function onLoad() {
      if (this.naturalWidth && !this.style.aspectRatio && !this.getAttribute('width')) {
        this.style.aspectRatio = `${this.naturalWidth} / ${this.naturalHeight}`;
      }
      this.removeEventListener('load', onLoad);
    });
  });
})();


// ─── 4. LCP OBSERVER — En Yüksek Öncelikli Görsel İzleyici ──────────────────
// PerformanceObserver ile LCP elementini izler ve konsola raporlar.
// Production'da bu veriyi analytics'e göndermek için özelleştirilebilir.

(function initLcpObserver() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const po = new PerformanceObserver(list => {
      const entries = list.getEntries();
      const last    = entries[entries.length - 1];
      if (!last) return;

      const lcpMs = Math.round(last.startTime);
      const el    = last.element;

      // Geliştirme modunda konsola yaz
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        console.groupCollapsed(`%c[CWV] LCP: ${lcpMs}ms`, 'color: #22c55e; font-weight: bold;');
        console.log('Element:', el);
        console.log('URL:', last.url || '(inline)');
        console.log('Render delay:', Math.round(last.renderTime - last.loadTime), 'ms');
        console.groupEnd();
      }

      // LCP 2500ms altındaysa sınıf ekle (tasarım override için)
      if (lcpMs < 2500 && el) el.dataset.lcpGood = 'true';
    });

    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) { /* PerformanceObserver desteği yoksa sessizce geç */ }
})();


// ─── 5. CLS TRACKER ──────────────────────────────────────────────────────────
// Kümülatif Layout Shift skorunu izler.
// Geliştirme modunda 0.1 eşiğini aşan shift'leri uyarır.

(function initClsTracker() {
  if (!('PerformanceObserver' in window)) return;
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

  let clsScore = 0;

  try {
    const po = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
          if (clsScore > 0.1) {
            console.warn(
              `%c[CWV] CLS Uyarısı: ${clsScore.toFixed(4)} (Hedef: < 0.1)`,
              'color: #f59e0b; font-weight: bold;'
            );
          }
        }
      });
    });

    po.observe({ type: 'layout-shift', buffered: true });
  } catch (e) { /* sessizce geç */ }
})();


// ─── 6. FONT DISPLAY SWAP GÜVENCESİ ─────────────────────────────────────────
// Google Fonts'tan yüklenen Inter fontunun CLS yaratmaması için
// font-display: swap kontrolü yapılır.

(function checkFontDisplay() {
  if (!document.fonts) return;
  document.fonts.ready.then(() => {
    // Font yüklendiğinde body'ye sınıf ekle — CSS ile CLS'ye neden olmadan stil geçişi
    document.body.classList.add('fonts-loaded');
  });
})();
