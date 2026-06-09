const fs = require('fs');

function cleanFile(filename) {
  let content = fs.readFileSync(filename, 'utf8');
  
  // Bozuk/görünmez kontrol karakterlerini kaldır (Türkçe harfleri koru)
  content = content.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  
  // Bozuk replacement characters ve bozuk byte'ları kaldır
  content = content.replace(/\ufffd+/g, '');
  
  // Bozuk emoji pattern'ları → HTML entity ile değiştir
  // 🏢 = &#127962;  📊 = &#128202;  🎬 = &#127916;  ✂️ = ✂  + = +  - = -
  // Doğrudan emoji'leri yeniden ekle
  const replacements = [
    ['span>?</span>\n      Muscent', 'span>🏢</span>\n      Muscent'],
    ['>?</span>\n      Ödemeler', '>💳</span>\n      Ödemeler'],
    ['>? Özel Müşteri Paneli', '>🔙 Özel Müşteri Paneli'],
    ['span>?</span>\n    Muscent', 'span>🏢</span>\n    Muscent'],
    ['Paneli Sıfırla', 'Paneli Sıfırla'],
    ['>? Çekim', '>🎬 Çekim'],
    ['>? Editlenen', '>✂️ Editlenen'],
    ['?</div>\n\n\n  <div class="stat-card"', '🎬</div>\n\n\n  <div class="stat-card"'],
    ['" style="font-size:28px">?', '" style="font-size:28px">✂️'],
    // Panel sıfırla butonu
    ['>? Sıfırla<', '>🗑️ Sıfırla<'],
    // Warning icon  
    ['font-size: 48px; margin-bottom: 16px;">?</div>', 'font-size: 48px; margin-bottom: 16px;">⚠️</div>'],
    ['font-size: 48px; margin-bottom: 16px;">?', 'font-size: 48px; margin-bottom: 16px;">⚠️'],
    // Shoot timeline
    ['>? Sil<', '>🗑️ Sil<'],
    // Stat icons
    ['class="stat-icon">?</div>', 'class="stat-icon">🎬</div>'],
    // Nav items
    ['span>?</span>\n      <br>Çekim', 'span>🎬</span>\n      <br>Çekim'],
  ];

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  fs.writeFileSync(filename, content, 'utf8');
  const remaining = (content.match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length;
  console.log(`${filename}: temizlendi. Kalan kontrol karakteri: ${remaining}`);
}

cleanFile('special-customer-dashboard.html');
cleanFile('special-customer-payments.html');
