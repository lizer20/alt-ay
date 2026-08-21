/* =========================================================
   FOTOĞRAF TETRİS
   Her düşen parça rastgele bir fotoğrafla gelir.
   ========================================================= */

const Tetris = (() => {
  const SUTUN = 10;
  const SATIR = 20;
  const TEMIZLEME_SURESI = 260; // satır silinirken yanıp sönme süresi (ms)

  const SEKILLER = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
  };

  const PUANLAR = [0, 100, 300, 500, 800];

  let tuval, ctx, siradakiTuval, sctx;
  let hucre = 33;
  let tahta = [];
  let parca = null;
  let siradaki = null;
  let torba = [];
  let skor = 0, satirSayisi = 0, seviye = 1;
  let rekor = Kayit.al("tetrisRekor", 0);
  let duraklat = false, bitti = false, aktif = false;
  let raf = null, sonZaman = 0;
  let dusmeSayaci = 0;
  let temizlenenSatirlar = null, temizlemeSayaci = 0;
  let yon = 0, dasSayaci = 0, asagiBasili = false, yumusakSayaci = 0;
  let sonFoto = -1;
  let cicekVerildi = false;           // bu oyunda şakayık kazanıldı mı
  const basiliDokunmalar = new Map(); // pointerId -> basılı tutulan tuş

  /* Tuvalde kullanılan renkler de CSS'teki paletten okunuyor, böylece
     temayı değiştirmek için tek dosyaya (stil.css) dokunmak yetiyor. */
  let izgaraRengi = "rgba(120, 76, 92, 0.10)";
  let parlamaRengi = "224, 87, 127";

  function renkleriOku() {
    const kok = getComputedStyle(document.documentElement);
    const izgara = kok.getPropertyValue("--izgara").trim();
    if (izgara) izgaraRengi = izgara;
  }

  /* Blok çizimi js/blokcizim.js içinde (blokCiz) — Blok Patlat ile ortak */

  /* ------------------------- tahta / parça ------------------------- */

  function bosTahta() {
    return Array.from({ length: SATIR }, () => new Array(SUTUN).fill(null));
  }

  function sonrakiTip() {
    if (!torba.length) torba = karistir(Object.keys(SEKILLER));
    return torba.pop();
  }

  function yeniParca() {
    const tip = sonrakiTip();
    const sekil = SEKILLER[tip].map((s) => s.slice());
    let foto = rastgele(FOTOLAR.length);
    if (FOTOLAR.length > 1) {
      while (foto === sonFoto) foto = rastgele(FOTOLAR.length);
    }
    sonFoto = foto;
    return {
      tip,
      sekil,
      foto,
      x: Math.floor((SUTUN - sekil[0].length) / 2),
      y: tip === "I" ? -1 : 0,
    };
  }

  function carpisiyorMu(sekil, px, py) {
    for (let r = 0; r < sekil.length; r++) {
      for (let s = 0; s < sekil[r].length; s++) {
        if (!sekil[r][s]) continue;
        const x = px + s, y = py + r;
        if (x < 0 || x >= SUTUN || y >= SATIR) return true;
        if (y >= 0 && tahta[y][x] !== null) return true;
      }
    }
    return false;
  }

  function dondurulmus(sekil) {
    const n = sekil.length;
    const yeni = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let s = 0; s < n; s++) yeni[s][n - 1 - r] = sekil[r][s];
    }
    return yeni;
  }

  function dondur() {
    if (!parca || duraklat || bitti || temizlenenSatirlar) return;
    const yeni = dondurulmus(parca.sekil);
    for (const kaydir of [0, -1, 1, -2, 2]) {
      if (!carpisiyorMu(yeni, parca.x + kaydir, parca.y)) {
        parca.sekil = yeni;
        parca.x += kaydir;
        Ses.dondur();
        return;
      }
    }
  }

  function hareketEt(dx) {
    if (!parca || duraklat || bitti || temizlenenSatirlar) return;
    if (!carpisiyorMu(parca.sekil, parca.x + dx, parca.y)) {
      parca.x += dx;
      Ses.kaydir();
    }
  }

  function asagiKaydir(elle) {
    if (!parca || duraklat || bitti || temizlenenSatirlar) return;
    if (!carpisiyorMu(parca.sekil, parca.x, parca.y + 1)) {
      parca.y++;
      if (elle) skor += 1;
    } else {
      kilitle();
    }
    dusmeSayaci = 0;
  }

  function anindaBirak() {
    if (!parca || duraklat || bitti || temizlenenSatirlar) return;
    let mesafe = 0;
    while (!carpisiyorMu(parca.sekil, parca.x, parca.y + 1)) {
      parca.y++;
      mesafe++;
    }
    skor += mesafe * 2;
    Ses.dus();
    kilitle();
  }

  function kilitle() {
    for (let r = 0; r < parca.sekil.length; r++) {
      for (let s = 0; s < parca.sekil[r].length; s++) {
        if (!parca.sekil[r][s]) continue;
        const x = parca.x + s, y = parca.y + r;
        if (y < 0) { oyunBitti(); return; }
        tahta[y][x] = parca.foto;
      }
    }

    const dolular = [];
    for (let r = 0; r < SATIR; r++) {
      if (tahta[r].every((h) => h !== null)) dolular.push(r);
    }

    if (dolular.length) {
      temizlenenSatirlar = dolular;
      temizlemeSayaci = TEMIZLEME_SURESI;
      Ses.satir(dolular.length);
      parca = null;
    } else {
      parcaVer();
    }
    bilgiGuncelle();
  }

  function satirlariKaldir() {
    const eskiSeviye = seviye;
    const adet = temizlenenSatirlar.length;

    // silinen hücreler fotoğraf kırıklarına ayrılsın
    const parcacik = adet > 2 ? 3 : 5;
    for (const r of temizlenenSatirlar) {
      for (let s = 0; s < SUTUN; s++) {
        if (tahta[r][s] !== null) {
          Efektler.patlat(s * hucre, r * hucre, hucre, tahta[r][s], parcacik);
        }
      }
    }
    const kazanilan = PUANLAR[Math.min(adet, 4)] * seviye;
    const ortaY = (temizlenenSatirlar.reduce((t, r) => t + r, 0) / adet) * hucre + hucre / 2;
    Efektler.yaziEkle((SUTUN * hucre) / 2, ortaY, "+" + kazanilan, "#d13f6b", Math.max(20, hucre * 0.7));
    if (adet >= 4) {
      Efektler.yaziEkle((SUTUN * hucre) / 2, ortaY - hucre * 1.4, "TETRİS!", "#7f5cbd", Math.max(18, hucre * 0.6));
    }
    Efektler.sars(Math.min(3 + adet * 3, 14), 0.3);

    for (const r of temizlenenSatirlar) {
      tahta.splice(r, 1);
      tahta.unshift(new Array(SUTUN).fill(null));
    }
    skor += PUANLAR[Math.min(temizlenenSatirlar.length, 4)] * seviye;
    satirSayisi += temizlenenSatirlar.length;
    seviye = Math.floor(satirSayisi / 10) + 1;
    if (seviye > eskiSeviye) Ses.seviye();
    if (seviye >= TETRIS_CICEK_HEDEFI && !cicekVerildi) {
      cicekVerildi = true;
      Bahce.topla("tetris");
    }
    temizlenenSatirlar = null;
    bilgiGuncelle();
    parcaVer();
  }

  function parcaVer() {
    parca = siradaki || yeniParca();
    siradaki = yeniParca();
    siradakiCiz();
    if (carpisiyorMu(parca.sekil, parca.x, parca.y)) oyunBitti();
  }

  function dusmeAraligi() {
    return Math.max(85, 900 - (seviye - 1) * 78);
  }

  /* ------------------------- durum / arayüz ------------------------- */

  function bilgiGuncelle() {
    document.getElementById("tetrisSkor").textContent = skor;
    document.getElementById("tetrisSeviye").textContent = seviye;
    document.getElementById("tetrisSatir").textContent = satirSayisi;
    if (skor > rekor) {
      rekor = skor;
      Kayit.yaz("tetrisRekor", rekor);
    }
    document.getElementById("tetrisRekor").textContent = rekor;
    hedefiGuncelle();
  }

  /* Şakayık hedefi: 3. seviye = 20 satır */
  function hedefiGuncelle() {
    const gerekenSatir = (TETRIS_CICEK_HEDEFI - 1) * 10;
    if (cicekVerildi) {
      Bahce.hedefGuncelle("tetrisHedef", "Şakayık kazanıldı!", 1, true);
    } else {
      Bahce.hedefGuncelle(
        "tetrisHedef",
        `Şakayık için ${TETRIS_CICEK_HEDEFI}. seviye · ${satirSayisi}/${gerekenSatir} satır`,
        satirSayisi / gerekenSatir,
        false
      );
    }
  }

  function katmanGoster(baslik, metin, dugme, skorGoster = false) {
    document.getElementById("tetrisKatmanBaslik").textContent = baslik;
    document.getElementById("tetrisKatmanMetin").textContent = metin;
    document.getElementById("tetrisKatmanDugme").textContent = dugme;
    const s = document.getElementById("tetrisKatmanSkor");
    s.style.display = skorGoster ? "block" : "none";
    s.textContent = skor;
    document.getElementById("tetrisKatman").classList.add("acik");
  }

  function katmanGizle() {
    document.getElementById("tetrisKatman").classList.remove("acik");
  }

  function oyunBitti() {
    bitti = true;
    parca = null;
    Ses.bitti();
    bilgiGuncelle();
    katmanGoster("Oyun bitti 💔", "Bir daha deneyelim mi?", "Yeni Oyun", true);
  }

  function duraklatAcKapa(zorla) {
    if (bitti || !aktif) return;
    duraklat = zorla === undefined ? !duraklat : zorla;
    if (duraklat) katmanGoster("Duraklatıldı", "Kaldığın yerden devam edebilirsin", "Devam Et");
    else katmanGizle();
    document.getElementById("tetrisDuraklat").textContent = duraklat ? "Devam" : "Duraklat";
  }

  /* ------------------------- boyutlandırma ------------------------- */

  function boyutlandir() {
    if (!tuval) return;
    const darEkran = window.innerWidth <= 760;
    const yatayPay = darEkran ? 34 : 250;

    /* Dikeyde ne kadar yer kaldığını tahmin etmek yerine ölçüyoruz:
       tahtanın üstünde kalan her şey + altındaki dokunmatik tuş şeridi.
       Böylece tuşlar her telefonda ekranın içinde kalıyor. */
    const tahtaUst = tuval.parentElement.getBoundingClientRect().top + window.scrollY;
    const serit = document.querySelector(".dokunmatik");
    const seritYuksekligi = serit && serit.offsetHeight ? serit.offsetHeight + 30 : 24;
    const dikeyPay = tahtaUst > 0 ? tahtaUst + seritYuksekligi + 10 : (darEkran ? 330 : 180);

    const hY = Math.floor((window.innerHeight - dikeyPay) / SATIR);
    const hX = Math.floor(Math.min(window.innerWidth - yatayPay, 420) / SUTUN);
    // Ekran çok kısaysa tahtayı küçültmek yerine sayfanın kaymasına izin ver
    hucre = Math.max(20, Math.min(hY, hX, 34));

    const g = hucre * SUTUN, y = hucre * SATIR;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    tuval.style.width = g + "px";
    tuval.style.height = y + "px";
    tuval.width = Math.round(g * dpr);
    tuval.height = Math.round(y * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ciz();
  }

  /* ------------------------- çizim ------------------------- */

  function ciz() {
    if (!ctx) return;
    const g = hucre * SUTUN, y = hucre * SATIR;

    // Tahtanın zemin rengi CSS'ten geliyor (.tetris-tahta), burada sadece siliyoruz
    ctx.clearRect(0, 0, g, y);

    const sarsinti = Efektler.sarsintiOfseti();
    ctx.save();
    ctx.translate(sarsinti.x, sarsinti.y);

    // ızgara
    ctx.strokeStyle = izgaraRengi;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let s = 1; s < SUTUN; s++) { ctx.moveTo(s * hucre + 0.5, 0); ctx.lineTo(s * hucre + 0.5, y); }
    for (let r = 1; r < SATIR; r++) { ctx.moveTo(0, r * hucre + 0.5); ctx.lineTo(g, r * hucre + 0.5); }
    ctx.stroke();

    // yerleşmiş bloklar
    for (let r = 0; r < SATIR; r++) {
      for (let s = 0; s < SUTUN; s++) {
        if (tahta[r][s] === null) continue;
        blokCiz(ctx, s * hucre, r * hucre, hucre, tahta[r][s]);
      }
    }

    // silinen satırların parlaması
    if (temizlenenSatirlar) {
      const oran = temizlemeSayaci / TEMIZLEME_SURESI;
      const parlaklik = Math.abs(Math.sin(oran * Math.PI * 3)) * 0.85;
      ctx.fillStyle = `rgba(${parlamaRengi},${parlaklik})`;
      for (const r of temizlenenSatirlar) ctx.fillRect(0, r * hucre, g, hucre);
    }

    if (parca) {
      // hayalet (nereye düşeceği)
      let hy = parca.y;
      while (!carpisiyorMu(parca.sekil, parca.x, hy + 1)) hy++;
      if (hy !== parca.y) {
        for (let r = 0; r < parca.sekil.length; r++) {
          for (let s = 0; s < parca.sekil[r].length; s++) {
            if (!parca.sekil[r][s]) continue;
            const yy = hy + r;
            if (yy < 0) continue;
            blokCiz(ctx, (parca.x + s) * hucre, yy * hucre, hucre, parca.foto, 0.3);
          }
        }
      }
      // parçanın kendisi
      for (let r = 0; r < parca.sekil.length; r++) {
        for (let s = 0; s < parca.sekil[r].length; s++) {
          if (!parca.sekil[r][s]) continue;
          const yy = parca.y + r;
          if (yy < 0) continue;
          blokCiz(ctx, (parca.x + s) * hucre, yy * hucre, hucre, parca.foto);
        }
      }
    }

    // fotoğraf kırıkları ve puan yazıları en üstte
    Efektler.ciz(ctx);
    ctx.restore();
  }

  function siradakiCiz() {
    if (!sctx || !siradaki) return;
    const g = siradakiTuval.width, y = siradakiTuval.height;
    sctx.clearRect(0, 0, g, y);

    const sekil = siradaki.sekil;
    // parçanın dolu olduğu alanı bul
    let minR = 9, maxR = -1, minS = 9, maxS = -1;
    for (let r = 0; r < sekil.length; r++) {
      for (let s = 0; s < sekil[r].length; s++) {
        if (!sekil[r][s]) continue;
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minS = Math.min(minS, s); maxS = Math.max(maxS, s);
      }
    }
    const gs = maxS - minS + 1, ys = maxR - minR + 1;
    const b = Math.min((g - 20) / gs, (y - 20) / ys, 26);
    const ox = (g - gs * b) / 2, oy = (y - ys * b) / 2;

    for (let r = minR; r <= maxR; r++) {
      for (let s = minS; s <= maxS; s++) {
        if (!sekil[r][s]) continue;
        blokCiz(sctx, ox + (s - minS) * b, oy + (r - minR) * b, b, siradaki.foto);
      }
    }
  }

  /* ------------------------- döngü ------------------------- */

  /* Oyunun bir adımı — geçen süre (ms) kadar ilerlet */
  function guncelle(fark) {
    Efektler.guncelle(fark);
    if (duraklat || bitti) return;

    if (temizlenenSatirlar) {
      temizlemeSayaci -= fark;
      if (temizlemeSayaci <= 0) satirlariKaldir();
      return;
    }

    if (yon !== 0) {
      dasSayaci -= fark;
      if (dasSayaci <= 0) { hareketEt(yon); dasSayaci = 55; }
    }
    if (asagiBasili) {
      yumusakSayaci -= fark;
      if (yumusakSayaci <= 0) { asagiKaydir(true); yumusakSayaci = 45; bilgiGuncelle(); }
    }
    dusmeSayaci += fark;
    if (dusmeSayaci > dusmeAraligi()) asagiKaydir(false);
  }

  function dongu(zaman) {
    if (!aktif) return;
    const fark = Math.min(zaman - sonZaman || 0, 100);
    sonZaman = zaman;
    guncelle(fark);
    ciz();
    raf = requestAnimationFrame(dongu);
  }

  /* ------------------------- girdi ------------------------- */

  function tusBasildi(e) {
    if (!aktif) return;
    const t = e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Spacebar"].includes(t)) {
      e.preventDefault();
    }
    if (t === "p" || t === "P") { duraklatAcKapa(); return; }
    if (duraklat || bitti) return;

    if (t === "ArrowLeft" && yon !== -1) { yon = -1; hareketEt(-1); dasSayaci = 170; }
    else if (t === "ArrowRight" && yon !== 1) { yon = 1; hareketEt(1); dasSayaci = 170; }
    else if (t === "ArrowUp") dondur();
    else if (t === "ArrowDown") { if (!asagiBasili) { asagiBasili = true; asagiKaydir(true); yumusakSayaci = 90; } }
    else if (t === " " || t === "Spacebar") { if (!e.repeat) anindaBirak(); }
  }

  function tusBirakildi(e) {
    if (e.key === "ArrowLeft" && yon === -1) yon = 0;
    if (e.key === "ArrowRight" && yon === 1) yon = 0;
    if (e.key === "ArrowDown") asagiBasili = false;
  }

  function dokunmatikKur() {
    document.querySelectorAll(".dokunmatik button").forEach((dugme) => {
      const tus = dugme.dataset.tus;
      const basiliTutulur = tus === "sol" || tus === "sag" || tus === "asagi";

      const basla = (e) => {
        e.preventDefault();
        Ses.uyandir();
        if (duraklat || bitti) return;

        // Parmak tuşun dışına kaysa bile bırakma olayı bu tuşa gelsin
        if (basiliTutulur && dugme.setPointerCapture) {
          try { dugme.setPointerCapture(e.pointerId); } catch { /* önemsiz */ }
        }
        if (basiliTutulur) basiliDokunmalar.set(e.pointerId, tus);

        if (tus === "sol") { yon = -1; hareketEt(-1); dasSayaci = 190; }
        else if (tus === "sag") { yon = 1; hareketEt(1); dasSayaci = 190; }
        else if (tus === "asagi") { asagiBasili = true; asagiKaydir(true); yumusakSayaci = 90; }
        else if (tus === "dondur") dondur();
        else if (tus === "birak") anindaBirak();
      };

      const bitir = (e) => dokunmaBitir(e.pointerId);

      dugme.addEventListener("pointerdown", basla);
      dugme.addEventListener("pointerup", bitir);
      dugme.addEventListener("pointercancel", bitir);
      dugme.addEventListener("pointerleave", bitir);
      // iOS uzun basma balonu araya girip yakalamayı iptal ederse
      dugme.addEventListener("lostpointercapture", bitir);
      // iOS'ta uzun basmanın metin seçme davranışını tamamen kapat
      dugme.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
      dugme.addEventListener("contextmenu", (e) => e.preventDefault());
    });

    /* Emniyet ağı: yukarıdakilerin hiçbiri gelmezse bile parmak
       kalktığı anda tuşu bırak. */
    document.addEventListener("pointerup", genelDokunmaBitir);
    document.addEventListener("pointercancel", genelDokunmaBitir);
    document.addEventListener("touchend", dokunmaSonuKontrol);
    document.addEventListener("touchcancel", dokunmaSonuKontrol);
  }

  function genelDokunmaBitir(e) {
    dokunmaBitir(e.pointerId);
  }

  /* Ekranda hiç parmak kalmadıysa basılı ne varsa bırak */
  function dokunmaSonuKontrol(e) {
    if (e.touches && e.touches.length === 0) tuslariBirak();
  }

  /* Sekme/pencere odağı kaybolunca basılı kalan tuşlar takılı kalmasın
     (keyup olayı gelmezse parça sonsuza kadar aşağı kayardı). */
  function tuslariBirak() {
    basiliDokunmalar.clear();
    yon = 0;
    asagiBasili = false;
  }

  /* Dokunmatikte her parmak ayrı takip edilir: iki başparmakla oynarken
     birinin bırakılması diğerini iptal etmesin. */
  function dokunmaBitir(pointerId) {
    const tus = basiliDokunmalar.get(pointerId);
    if (tus === undefined) return;
    basiliDokunmalar.delete(pointerId);
    if (tus === "sol" && yon === -1) yon = 0;
    if (tus === "sag" && yon === 1) yon = 0;
    if (tus === "asagi") asagiBasili = false;
  }

  function gorunurlukDegisti() {
    tuslariBirak();
    if (aktif && document.hidden) duraklatAcKapa(true);
  }

  /* ------------------------- dışa açılan ------------------------- */

  function yeniOyun() {
    tahta = bosTahta();
    torba = [];
    skor = 0; satirSayisi = 0; seviye = 1;
    cicekVerildi = false;
    duraklat = false; bitti = false;
    dusmeSayaci = 0; temizlenenSatirlar = null;
    yon = 0; asagiBasili = false;
    Efektler.temizle();
    siradaki = yeniParca();
    parcaVer();
    katmanGizle();
    document.getElementById("tetrisDuraklat").textContent = "Duraklat";
    bilgiGuncelle();
  }

  function baslat() {
    if (!tuval) {
      tuval = document.getElementById("tetrisTuval");
      ctx = tuval.getContext("2d");
      siradakiTuval = document.getElementById("siradakiTuval");
      sctx = siradakiTuval.getContext("2d");

      document.getElementById("tetrisYeni").addEventListener("click", () => { Ses.tik(); yeniOyun(); });
      document.getElementById("tetrisDuraklat").addEventListener("click", () => { Ses.tik(); duraklatAcKapa(); });
      document.getElementById("tetrisKatmanDugme").addEventListener("click", () => {
        Ses.tik();
        if (bitti) yeniOyun();
        else duraklatAcKapa(false);
      });
      dokunmatikKur();
      document.addEventListener("visibilitychange", gorunurlukDegisti);
      window.addEventListener("blur", tuslariBirak);
      window.addEventListener("resize", () => { if (aktif) boyutlandir(); });
    }

    aktif = true;
    renkleriOku();
    document.addEventListener("keydown", tusBasildi);
    document.addEventListener("keyup", tusBirakildi);
    yeniOyun();
    boyutlandir();
    sonZaman = performance.now();
    raf = requestAnimationFrame(dongu);
  }

  function durdur() {
    aktif = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    document.removeEventListener("keydown", tusBasildi);
    document.removeEventListener("keyup", tusBirakildi);
    yon = 0;
    asagiBasili = false;
    Efektler.temizle();
  }

  function rekoruGetir() {
    return Kayit.al("tetrisRekor", 0);
  }

  return { baslat, durdur, rekoruGetir };
})();
