/* =========================================================
   FOTOĞRAFLI BLOK ÇİZİMİ
   Hem Tetris hem Blok Patlat bunu kullanıyor; blokların
   görünümünü değiştirmek istersen tek yer burası.
   ========================================================= */

/* Yuvarlak köşeli dikdörtgen yolu (eski tarayıcılar için yedekli) */
function yuvarlakYol(c, x, y, en, boy, r) {
  c.beginPath();
  if (c.roundRect) { c.roundRect(x, y, en, boy, r); return; }
  c.moveTo(x + r, y);
  c.arcTo(x + en, y, x + en, y + boy, r);
  c.arcTo(x + en, y + boy, x, y + boy, r);
  c.arcTo(x, y + boy, x, y, r);
  c.arcTo(x, y, x + en, y, r);
  c.closePath();
}

/* Tek bir fotoğraflı blok çiz */
function blokCiz(c, x, y, boyut, fotoIdx, alfa = 1) {
  const bosluk = Math.max(1, boyut * 0.055);
  const bx = x + bosluk / 2, by = y + bosluk / 2, bb = boyut - bosluk;
  const r = Math.max(3, boyut * 0.17);
  const img = TILE_IMG[fotoIdx % TILE_IMG.length];

  c.save();
  c.globalAlpha = alfa;
  yuvarlakYol(c, bx, by, bb, bb, r);
  c.clip();

  if (img && img.complete && img.naturalWidth) {
    c.drawImage(img, bx, by, bb, bb);
  } else {
    c.fillStyle = "#d13f6b";
    c.fillRect(bx, by, bb, bb);
  }

  // hafif hacim hissi — fotoğrafı boğmayacak kadar ince
  const gr = c.createLinearGradient(bx, by, bx, by + bb);
  gr.addColorStop(0, "rgba(255,255,255,0.16)");
  gr.addColorStop(0.35, "rgba(255,255,255,0)");
  gr.addColorStop(1, "rgba(0,0,0,0.22)");
  c.fillStyle = gr;
  c.fillRect(bx, by, bb, bb);
  c.restore();

  // Beyaz kenarlık: her blok küçük bir fotoğraf baskısı gibi dursun
  c.save();
  c.globalAlpha = alfa * 0.9;
  yuvarlakYol(c, bx, by, bb, bb, r);
  c.strokeStyle = "rgba(255,255,255,0.8)";
  c.lineWidth = Math.max(1.2, boyut * 0.045);
  c.stroke();
  c.restore();
}

/* Boş hücre (oyun tahtasındaki çukur kare) */
function bosHucreCiz(c, x, y, boyut, renk) {
  const bosluk = Math.max(1, boyut * 0.055);
  const bb = boyut - bosluk;
  c.save();
  yuvarlakYol(c, x + bosluk / 2, y + bosluk / 2, bb, bb, Math.max(3, boyut * 0.17));
  c.fillStyle = renk;
  c.fill();
  c.restore();
}

/* Bir şeklin kaç sütun / kaç satır olduğu */
function sekilEni(sekil) {
  return Math.max(...sekil.map((s) => s.length));
}
function sekilBoyu(sekil) {
  return sekil.length;
}
function sekilHucreSayisi(sekil) {
  return sekil.reduce((t, satir) => t + satir.filter(Boolean).length, 0);
}
