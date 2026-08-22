/* =========================================================
   AYARLAR  —  Buradaki değerleri rahatça değiştirebilirsin.
   ========================================================= */

const AYARLAR = {
  // Sitenin başlığı ve alt yazısı
  baslik: "Rüveyda & Emre",
  altYazi: "bizim küçük oyun salonumuz",

  // Menüdeki kalp fotoğrafının kaç saniyede bir değişeceği
  heroDegisimSn: 4,

  // Klasördeki fotoğraf sayısı.
  // Yeni fotoğraf eklersen (assets/tiles, assets/kare, assets/foto klasörlerinin
  // üçüne de aynı isimle) bu sayıyı artırman yeterli.
  fotoSayisi: 30,
};

/* ---------------------------------------------------------
   Fotoğraf listesi — üç boyut:
     tile : 160px kare   -> Tetris blokları (hızlı çizim için)
     kare : 560px kare   -> Hafıza kartları, yapboz
     foto : uzun kenar 1100px -> büyük gösterim
   --------------------------------------------------------- */
const FOTOLAR = Array.from({ length: AYARLAR.fotoSayisi }, (_, i) => {
  const no = String(i + 1).padStart(2, "0");
  return {
    no,
    tile: `assets/tiles/foto-${no}.jpg`,
    kare: `assets/kare/foto-${no}.jpg`,
    foto: `assets/foto/foto-${no}.jpg`,
  };
});

/* Tetris blokları için önceden yüklenmiş görseller */
const TILE_IMG = FOTOLAR.map((f) => {
  const img = new Image();
  img.src = f.tile;
  return img;
});

/* --------------------- küçük yardımcılar --------------------- */

function rastgele(n) {
  return Math.floor(Math.random() * n);
}

function karistir(dizi) {
  const d = dizi.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = rastgele(i + 1);
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/* localStorage bazı tarayıcılarda dosyadan açınca kapalı olabiliyor,
   o yüzden her erişimi try/catch içine alıyoruz. */
const Kayit = {
  al(anahtar, varsayilan = null) {
    try {
      const v = localStorage.getItem("ruveyda:" + anahtar);
      return v === null ? varsayilan : JSON.parse(v);
    } catch {
      return varsayilan;
    }
  },
  yaz(anahtar, deger) {
    try {
      localStorage.setItem("ruveyda:" + anahtar, JSON.stringify(deger));
    } catch {
      /* sessizce geç */
    }
  },
};

function sureMetni(ms) {
  const t = Math.floor(ms / 1000);
  const dk = String(Math.floor(t / 60)).padStart(2, "0");
  const sn = String(t % 60).padStart(2, "0");
  return `${dk}:${sn}`;
}
