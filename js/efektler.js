/* =========================================================
   EFEKTLER
   Parçacıklar, uçuşan yazılar ve ekran sarsıntısı.
   Blok Patlat ve Tetris ortak kullanıyor.
   ========================================================= */

const Efektler = (() => {
  const EN_FAZLA_PARCACIK = 260;

  let parcaciklar = [];
  let yazilar = [];
  let sarsintiYasi = 0, sarsintiSuresi = 0, sarsintiSiddeti = 0;

  /* Bir hücreden fotoğraf kırıkları fışkırt */
  function patlat(x, y, boyut, fotoIdx, adet = 5) {
    if (parcaciklar.length > EN_FAZLA_PARCACIK) return;
    for (let i = 0; i < adet; i++) {
      const aci = Math.random() * Math.PI * 2;
      const hiz = 70 + Math.random() * 210;
      parcaciklar.push({
        x: x + boyut / 2,
        y: y + boyut / 2,
        vx: Math.cos(aci) * hiz,
        vy: Math.sin(aci) * hiz - 110,      // biraz yukarı doğru fırlasın
        boyut: boyut * (0.2 + Math.random() * 0.24),
        aci: Math.random() * Math.PI * 2,
        donme: (Math.random() - 0.5) * 9,
        foto: fotoIdx,
        omur: 0.55 + Math.random() * 0.5,
        yas: 0,
      });
    }
  }

  /* Yukarı süzülüp kaybolan yazı */
  function yaziEkle(x, y, metin, renk = "#d13f6b", boyut = 26) {
    yazilar.push({ x, y, metin, renk, boyut, yas: 0, omur: 1.15 });
  }

  function sars(siddet, sure = 0.32) {
    sarsintiSiddeti = Math.max(sarsintiSiddeti, siddet);
    sarsintiSuresi = Math.max(sarsintiSuresi, sure);
    sarsintiYasi = 0;
  }

  function guncelle(farkMs) {
    const dt = Math.min(farkMs, 60) / 1000;

    for (let i = parcaciklar.length - 1; i >= 0; i--) {
      const p = parcaciklar[i];
      p.yas += dt;
      if (p.yas >= p.omur) { parcaciklar.splice(i, 1); continue; }
      p.vy += 900 * dt;            // yer çekimi
      p.vx *= 1 - 1.1 * dt;        // hava sürtünmesi
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.aci += p.donme * dt;
    }

    for (let i = yazilar.length - 1; i >= 0; i--) {
      const y = yazilar[i];
      y.yas += dt;
      if (y.yas >= y.omur) yazilar.splice(i, 1);
    }

    if (sarsintiSuresi > 0) {
      sarsintiYasi += dt;
      if (sarsintiYasi >= sarsintiSuresi) {
        sarsintiSuresi = 0;
        sarsintiSiddeti = 0;
      }
    }
  }

  /* Sarsıntının o anki kaydırma miktarı */
  function sarsintiOfseti() {
    if (sarsintiSuresi <= 0) return { x: 0, y: 0 };
    const kalan = 1 - sarsintiYasi / sarsintiSuresi;
    const g = sarsintiSiddeti * kalan * kalan;
    return { x: (Math.random() - 0.5) * 2 * g, y: (Math.random() - 0.5) * 2 * g };
  }

  function ciz(c) {
    // fotoğraf kırıkları
    for (const p of parcaciklar) {
      const oran = p.yas / p.omur;
      const alfa = oran > 0.7 ? 1 - (oran - 0.7) / 0.3 : 1;
      const img = TILE_IMG[p.foto % TILE_IMG.length];
      c.save();
      c.globalAlpha = Math.max(0, alfa);
      c.translate(p.x, p.y);
      c.rotate(p.aci);
      const yari = p.boyut / 2;
      // Not: kırpma yok — uçuşan minik kırıkta yuvarlak köşe fark edilmiyor
      // ama 200+ parçacıkta kare başına 200 kırpma telefonu zorluyordu.
      if (img && img.complete && img.naturalWidth) {
        c.drawImage(img, -yari, -yari, p.boyut, p.boyut);
      } else {
        c.fillStyle = "#d13f6b";
        c.fillRect(-yari, -yari, p.boyut, p.boyut);
      }
      c.restore();
    }

    // uçuşan yazılar
    for (const y of yazilar) {
      const oran = y.yas / y.omur;
      // hızlı büyüyüp hafif geri oturan bir giriş
      let olcek;
      if (oran < 0.16) olcek = 0.4 + (oran / 0.16) * 0.75;
      else if (oran < 0.28) olcek = 1.15 - ((oran - 0.16) / 0.12) * 0.15;
      else olcek = 1;
      const alfa = oran > 0.6 ? 1 - (oran - 0.6) / 0.4 : 1;
      const yukselme = oran * 46;

      c.save();
      c.globalAlpha = Math.max(0, alfa);
      c.translate(y.x, y.y - yukselme);
      c.scale(olcek, olcek);
      c.font = `800 ${y.boyut}px "Segoe UI", system-ui, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = Math.max(3, y.boyut * 0.16);
      c.strokeStyle = "rgba(255,255,255,0.95)";
      c.lineJoin = "round";
      c.strokeText(y.metin, 0, 0);
      c.fillStyle = y.renk;
      c.fillText(y.metin, 0, 0);
      c.restore();
    }
  }

  function temizle() {
    parcaciklar = [];
    yazilar = [];
    sarsintiSuresi = 0;
    sarsintiSiddeti = 0;
  }

  function bosMu() {
    return parcaciklar.length === 0 && yazilar.length === 0 && sarsintiSuresi <= 0;
  }

  return { patlat, yaziEkle, sars, guncelle, ciz, sarsintiOfseti, temizle, bosMu };
})();
