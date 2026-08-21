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

/* ---------------------------------------------------------
   Blok görselleri önbelleği

   Her blok her karede sıfırdan çizilirse (kırpma + gradyan + kenarlık)
   telefonda 60 kare/sn tutturmak mümkün olmuyor — tahtada 60+ blok var.
   Bunun yerine her (fotoğraf, boyut) ikilisi için bir kez küçük bir
   tuvale çizip sonra sadece kopyalıyoruz.
   --------------------------------------------------------- */

const _blokOnbellek = new Map();
let _onbellekDpr = 0;

function blokOnbellegiTemizle() {
  _blokOnbellek.clear();
}

function _ekranOrani() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function blokSprite(fotoIdx, boyut) {
  const b = Math.max(4, Math.round(boyut));
  const dpr = _ekranOrani();
  if (dpr !== _onbellekDpr) {
    _blokOnbellek.clear();
    _onbellekDpr = dpr;
  }

  const anahtar = fotoIdx + "|" + b;
  const hazirSprite = _blokOnbellek.get(anahtar);
  if (hazirSprite) return hazirSprite;

  const k = document.createElement("canvas");
  k.width = k.height = Math.round(b * dpr);
  const c = k.getContext("2d");
  c.scale(dpr, dpr);
  const fotoHazir = _blokIcCiz(c, 0, 0, b, fotoIdx);

  // fotoğraf henüz yüklenmediyse önbelleğe alma, sonraki karede tekrar dene
  if (fotoHazir) _blokOnbellek.set(anahtar, k);
  return k;
}

/* Tek bir fotoğraflı blok çiz (önbellekten kopyalanır) */
function blokCiz(c, x, y, boyut, fotoIdx, alfa = 1) {
  const sprite = blokSprite(fotoIdx, boyut);
  if (alfa !== 1) {
    c.save();
    c.globalAlpha = alfa;
    c.drawImage(sprite, x, y, boyut, boyut);
    c.restore();
  } else {
    c.drawImage(sprite, x, y, boyut, boyut);
  }
}

/* Bloğun asıl çizimi — sadece önbellek doldurulurken çalışır */
function _blokIcCiz(c, x, y, boyut, fotoIdx) {
  const bosluk = Math.max(1, boyut * 0.055);
  const bx = x + bosluk / 2, by = y + bosluk / 2, bb = boyut - bosluk;
  const r = Math.max(3, boyut * 0.17);
  const img = TILE_IMG[fotoIdx % TILE_IMG.length];

  const fotoHazir = !!(img && img.complete && img.naturalWidth);

  c.save();
  yuvarlakYol(c, bx, by, bb, bb, r);
  c.clip();

  if (fotoHazir) {
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
  c.globalAlpha = 0.9;
  yuvarlakYol(c, bx, by, bb, bb, r);
  c.strokeStyle = "rgba(255,255,255,0.8)";
  c.lineWidth = Math.max(1.2, boyut * 0.045);
  c.stroke();
  c.restore();

  return fotoHazir;
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
