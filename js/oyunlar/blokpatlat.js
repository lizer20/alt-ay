/* =========================================================
   BLOK PATLAT  (Block Blast tarzı)
   8x8 tahta. Aşağıdaki üç parçayı sürükleyip tahtaya bırak.
   Bir satır veya sütun tamamen dolunca patlar.
   Üç parçanın da sığacak yeri kalmayınca oyun biter.
   ========================================================= */

const BlokPatlat = (() => {
  const IZGARA = 8;
  const TEPSI_ADET = 3;
  const PATLAMA_SURESI = 320;   // patlama animasyonu (ms)
  const YERLESME_SURESI = 220;  // yerleşen parçanın zıplaması (ms)
  const TEPSI_GIRIS_SURESI = 260;

  /* Parça çeşitleri — Block Blast'takine yakın bir set */
  const SEKILLER = [
    [[1]],
    [[1, 1]], [[1], [1]],
    [[1, 1, 1]], [[1], [1], [1]],
    [[1, 1, 1, 1]], [[1], [1], [1], [1]],
    [[1, 1, 1, 1, 1]], [[1], [1], [1], [1], [1]],
    [[1, 1], [1, 1]],
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
    [[1, 1, 1], [1, 1, 1]], [[1, 1], [1, 1], [1, 1]],
    // küçük köşeler
    [[1, 0], [1, 1]], [[0, 1], [1, 1]], [[1, 1], [1, 0]], [[1, 1], [0, 1]],
    // büyük L'ler
    [[1, 0, 0], [1, 0, 0], [1, 1, 1]], [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
    [[1, 1, 1], [1, 0, 0], [1, 0, 0]], [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
    // T'ler
    [[1, 1, 1], [0, 1, 0]], [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]], [[0, 1], [1, 1], [0, 1]],
    // S / Z
    [[0, 1, 1], [1, 1, 0]], [[1, 1, 0], [0, 1, 1]],
    [[1, 0], [1, 1], [0, 1]], [[0, 1], [1, 1], [1, 0]],
  ];

  const OVGULER = [
    { esik: 4, metin: "İNANILMAZ!" },
    { esik: 3, metin: "HARİKA!" },
    { esik: 2, metin: "SÜPER!" },
  ];

  let tuval, ctx;
  let hucre = 40, tepsiHucre = 20, tepsiUst = 0, tepsiYuksekligi = 0, pay = 20;
  let tahta = [];
  let tepsi = [];              // 3 parça: {sekil, foto} veya null
  let skor = 0, kombo = 0;
  let cicekVerildi = false;          // bu oyunda şakayık kazanıldı mı
  let rekor = Kayit.al("blokRekor", 0);
  let bitti = false, aktif = false, kuruldu = false;
  let raf = null, sonZaman = 0;
  let suruklenen = null;       // {slot, x, y, yukariKaydir}
  let patlama = null;          // {hucreler:[[r,s,foto]...], sayac, toplam}
  let yerlesme = null;         // {anahtarlar:Set, sayac}
  let tepsiGiris = 0;
  let izgaraRengi = "rgba(120, 76, 92, 0.10)";

  /* ------------------------- tahta işlemleri ------------------------- */

  function bosTahta() {
    return Array.from({ length: IZGARA }, () => new Array(IZGARA).fill(null));
  }

  function sigarMi(sekil, satir, sutun) {
    for (let r = 0; r < sekil.length; r++) {
      for (let s = 0; s < sekil[r].length; s++) {
        if (!sekil[r][s]) continue;
        const y = satir + r, x = sutun + s;
        if (y < 0 || y >= IZGARA || x < 0 || x >= IZGARA) return false;
        if (tahta[y][x] !== null) return false;
      }
    }
    return true;
  }

  /* Bu parça tahtada herhangi bir yere sığıyor mu? */
  function biryereSigarMi(sekil) {
    for (let r = 0; r <= IZGARA - sekilBoyu(sekil); r++) {
      for (let s = 0; s <= IZGARA - sekilEni(sekil); s++) {
        if (sigarMi(sekil, r, s)) return true;
      }
    }
    return false;
  }

  function yeniParca() {
    const sekil = SEKILLER[rastgele(SEKILLER.length)].map((s) => s.slice());
    return { sekil, foto: rastgele(FOTOLAR.length) };
  }

  function tepsiyiDoldur() {
    tepsi = Array.from({ length: TEPSI_ADET }, yeniParca);
    tepsiGiris = TEPSI_GIRIS_SURESI;
  }

  /* ------------------------- yerleştirme ------------------------- */

  function yerlestir(slot, satir, sutun) {
    const parca = tepsi[slot];
    if (!parca || !sigarMi(parca.sekil, satir, sutun)) return false;

    const yeni = new Set();
    for (let r = 0; r < parca.sekil.length; r++) {
      for (let s = 0; s < parca.sekil[r].length; s++) {
        if (!parca.sekil[r][s]) continue;
        tahta[satir + r][sutun + s] = parca.foto;
        yeni.add((satir + r) + "," + (sutun + s));
      }
    }
    yerlesme = { anahtarlar: yeni, sayac: YERLESME_SURESI };
    skor += sekilHucreSayisi(parca.sekil);
    tepsi[slot] = null;
    Ses.dus();

    dolulariPatlat();
    if (tepsi.every((p) => p === null)) tepsiyiDoldur();
    bilgiGuncelle();
    return true;
  }

  function dolulariPatlat() {
    const satirlar = [], sutunlar = [];
    for (let r = 0; r < IZGARA; r++) {
      if (tahta[r].every((h) => h !== null)) satirlar.push(r);
    }
    for (let s = 0; s < IZGARA; s++) {
      let dolu = true;
      for (let r = 0; r < IZGARA; r++) if (tahta[r][s] === null) { dolu = false; break; }
      if (dolu) sutunlar.push(s);
    }

    const cizgi = satirlar.length + sutunlar.length;
    if (!cizgi) {
      kombo = 0;
      return;
    }

    // patlayacak hücreleri topla (kesişimler bir kez sayılsın)
    const anahtarlar = new Set();
    satirlar.forEach((r) => { for (let s = 0; s < IZGARA; s++) anahtarlar.add(r + "," + s); });
    sutunlar.forEach((s) => { for (let r = 0; r < IZGARA; r++) anahtarlar.add(r + "," + s); });
    const hucreler = [...anahtarlar].map((a) => {
      const [r, s] = a.split(",").map(Number);
      return [r, s, tahta[r][s]];
    });

    kombo++;
    const carpan = cizgi * (1 + (kombo - 1) * 0.5);
    const kazanilan = Math.round(hucreler.length * 10 * carpan);
    skor += kazanilan;

    patlama = { hucreler, sayac: PATLAMA_SURESI, toplam: PATLAMA_SURESI };
    Ses.satir(cizgi);
    patlamaEfektleri(hucreler, cizgi, kazanilan);
  }

  /* Patlamanın görsel şenliği: fotoğraf kırıkları, yazılar, sarsıntı */
  function patlamaEfektleri(hucreler, cizgi, kazanilan) {
    // çok hücre patlarken parçacık sayısını azalt, akıcılık bozulmasın
    const adet = hucreler.length > 24 ? 2 : hucreler.length > 12 ? 3 : 5;
    for (const [r, s, foto] of hucreler) {
      Efektler.patlat(s * hucre, r * hucre, hucre, foto, adet);
    }

    /* Yazılar patlamanın ortasında çıkar ama yukarı süzüldükleri için
       tahtanın üst satırlarında taşmasınlar diye sınırlandırılıyor. */
    const en = IZGARA * hucre;
    const ortaX = Math.min(
      Math.max((hucreler.reduce((t, h) => t + h[1], 0) / hucreler.length) * hucre + hucre / 2, hucre * 2),
      en - hucre * 2
    );
    const hamY = (hucreler.reduce((t, h) => t + h[0], 0) / hucreler.length) * hucre + hucre / 2;
    const ortaY = Math.min(Math.max(hamY, hucre * 2.6 + 46), en - hucre * 0.5);

    Efektler.yaziEkle(ortaX, ortaY, "+" + kazanilan, "#d13f6b", Math.max(20, hucre * 0.62));
    if (kombo > 1) {
      Efektler.yaziEkle(ortaX, ortaY - hucre, "KOMBO ×" + kombo, "#b07d24", Math.max(17, hucre * 0.48));
    }
    const ovgu = OVGULER.find((o) => cizgi >= o.esik);
    if (ovgu) {
      Efektler.yaziEkle(ortaX, ortaY - hucre * 1.95, ovgu.metin, "#7f5cbd", Math.max(18, hucre * 0.54));
    }

    Efektler.sars(Math.min(4 + cizgi * 3, 15), 0.3);
  }

  function patlamayiBitir() {
    for (const [r, s] of patlama.hucreler) tahta[r][s] = null;
    patlama = null;
    bilgiGuncelle();
    bitisKontrol();
  }

  function bitisKontrol() {
    const kalanlar = tepsi.filter(Boolean);
    if (!kalanlar.length) return;
    if (kalanlar.some((p) => biryereSigarMi(p.sekil))) return;
    oyunBitti();
  }

  function oyunBitti() {
    bitti = true;
    suruklenen = null;
    Ses.bitti();
    document.getElementById("blokKatmanSkor").textContent = skor;
    document.getElementById("blokKatmanMetin").textContent =
      skor >= rekor ? "Yeni rekor! 🏆" : "Rekorun: " + rekor;
    document.getElementById("blokKatman").classList.add("acik");
  }

  /* ------------------------- arayüz ------------------------- */

  function bilgiGuncelle() {
    document.getElementById("blokSkor").textContent = skor;
    if (skor > rekor) {
      rekor = skor;
      Kayit.yaz("blokRekor", rekor);
    }
    document.getElementById("blokRekor").textContent = rekor;
    const k = document.getElementById("blokKombo");
    k.textContent = kombo > 1 ? "×" + kombo : "—";
    k.classList.toggle("alevli", kombo > 1);

    if (!cicekVerildi && skor >= BLOK_CICEK_HEDEFI) {
      cicekVerildi = true;
      Bahce.topla("blokpatlat");
    }
    if (cicekVerildi) {
      Bahce.hedefGuncelle("blokHedef", "Şakayık kazanıldı!", 1, true);
    } else {
      Bahce.hedefGuncelle(
        "blokHedef",
        `Şakayık için ${BLOK_CICEK_HEDEFI} puan · ${skor}`,
        skor / BLOK_CICEK_HEDEFI,
        false
      );
    }
  }

  /* ------------------------- boyutlandırma ------------------------- */

  function boyutlandir() {
    if (!tuval) return;
    const darEkran = window.innerWidth <= 760;

    const kullanilabilirEn = Math.min(window.innerWidth - (darEkran ? 28 : 60), 470);
    const tahtaUst = tuval.parentElement.getBoundingClientRect().top + window.scrollY;
    const kullanilabilirBoy = window.innerHeight - tahtaUst - (darEkran ? 28 : 50);

    // tuvalde tahtanın çevresinde bir pay var (parçacıklar taşabilsin diye):
    // yatayda 1 hücre, dikeyde 1 hücre + tepsi (~2.6 hücre)
    const hX = Math.floor(kullanilabilirEn / (IZGARA + 1));
    const hY = Math.floor(kullanilabilirBoy / (IZGARA + 3.6));
    hucre = Math.max(26, Math.min(hX, hY, 54));

    pay = Math.round(hucre * 0.5);
    tepsiHucre = Math.round(hucre * 0.5);
    const bosluk = Math.round(hucre * 0.45);
    tepsiUst = IZGARA * hucre + bosluk;
    tepsiYuksekligi = Math.round(tepsiHucre * 3.4);

    const en = IZGARA * hucre + pay * 2;
    const boy = tepsiUst + tepsiYuksekligi + pay * 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    tuval.style.width = en + "px";
    tuval.style.height = boy + "px";
    tuval.width = Math.round(en * dpr);
    tuval.height = Math.round(boy * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ciz();
  }

  /* Bir tepsi yuvasının ölçüleri (tahta koordinatında) */
  function yuvaKutusu(slot) {
    const yuvaEni = (IZGARA * hucre) / TEPSI_ADET;
    return { x: slot * yuvaEni, y: tepsiUst, en: yuvaEni, boy: tepsiYuksekligi };
  }

  /* Sürüklenen parçanın sol üst köşesi (tahta koordinatında) */
  function suruklenenKonum() {
    const parca = tepsi[suruklenen.slot];
    const en = sekilEni(parca.sekil) * hucre;
    const boy = sekilBoyu(parca.sekil) * hucre;
    return {
      x: suruklenen.x - en / 2,
      y: suruklenen.y - (suruklenen.yukariKaydir ? boy + hucre * 0.35 : boy / 2),
      en, boy,
    };
  }

  function hedefHucre() {
    const k = suruklenenKonum();
    return { satir: Math.round(k.y / hucre), sutun: Math.round(k.x / hucre) };
  }

  /* ------------------------- çizim ------------------------- */

  /* Ölçeklenerek çizilen blok (zıplama / patlama için) */
  function olcekliBlok(x, y, foto, olcek, beyazlik = 0) {
    ctx.save();
    ctx.translate(x + hucre / 2, y + hucre / 2);
    ctx.scale(olcek, olcek);
    blokCiz(ctx, -hucre / 2, -hucre / 2, hucre, foto);
    if (beyazlik > 0) {
      ctx.globalAlpha = beyazlik;
      ctx.fillStyle = "#fff";
      yuvarlakYol(ctx, -hucre / 2, -hucre / 2, hucre, hucre, hucre * 0.17);
      ctx.fill();
    }
    ctx.restore();
  }

  function yerlesmeOlcegi(r, s) {
    if (!yerlesme || !yerlesme.anahtarlar.has(r + "," + s)) return 1;
    const t = 1 - yerlesme.sayac / YERLESME_SURESI;   // 0 -> 1
    return 1 + Math.sin(t * Math.PI) * 0.24;          // zıplayıp yerine oturur
  }

  function ciz() {
    if (!ctx) return;
    const en = IZGARA * hucre;
    ctx.clearRect(0, 0, en + pay * 2, tepsiUst + tepsiYuksekligi + pay * 2);

    const sarsinti = Efektler.sarsintiOfseti();
    ctx.save();
    ctx.translate(pay + sarsinti.x, pay + sarsinti.y);

    // boş hücreler
    for (let r = 0; r < IZGARA; r++) {
      for (let s = 0; s < IZGARA; s++) {
        if (tahta[r][s] === null) bosHucreCiz(ctx, s * hucre, r * hucre, hucre, izgaraRengi);
      }
    }

    // yerleşecek yerin önizlemesi
    let onizlemeHucreleri = null;
    if (suruklenen && !bitti && tepsi[suruklenen.slot]) {
      const parca = tepsi[suruklenen.slot];
      const { satir, sutun } = hedefHucre();
      if (sigarMi(parca.sekil, satir, sutun)) {
        onizlemeHucreleri = [];
        for (let r = 0; r < parca.sekil.length; r++) {
          for (let s = 0; s < parca.sekil[r].length; s++) {
            if (parca.sekil[r][s]) onizlemeHucreleri.push([satir + r, sutun + s]);
          }
        }
        for (const [r, s] of onizlemeHucreleri) {
          blokCiz(ctx, s * hucre, r * hucre, hucre, parca.foto, 0.38);
        }
      }
    }

    // patlayanlar ayrı çizilecek
    const patlayanlar = new Set();
    if (patlama) for (const [r, s] of patlama.hucreler) patlayanlar.add(r + "," + s);

    // yerleşmiş bloklar
    for (let r = 0; r < IZGARA; r++) {
      for (let s = 0; s < IZGARA; s++) {
        if (tahta[r][s] === null || patlayanlar.has(r + "," + s)) continue;
        const o = yerlesmeOlcegi(r, s);
        if (o === 1) blokCiz(ctx, s * hucre, r * hucre, hucre, tahta[r][s]);
        else olcekliBlok(s * hucre, r * hucre, tahta[r][s], o);
      }
    }

    // patlayan bloklar: bir an büyüyüp beyazlaşarak küçülüp kaybolur
    if (patlama) {
      const t = 1 - patlama.sayac / patlama.toplam;
      const olcek = t < 0.25 ? 1 + t * 0.7 : Math.max(0, 1.175 * (1 - (t - 0.25) / 0.75));
      const beyazlik = Math.min(0.8, t * 1.6);
      for (const [r, s, foto] of patlama.hucreler) {
        if (olcek > 0.02) olcekliBlok(s * hucre, r * hucre, foto, olcek, beyazlik);
      }
    }

    // "bu satır/sütun patlayacak" vurgusu — blokların üstünde
    if (onizlemeHucreleri) vurguCiz(onizlemeHucreleri);

    tepsiCiz();

    // elde tutulan parça en üstte
    if (suruklenen && !bitti && tepsi[suruklenen.slot]) suruklenenCiz();

    // parçacıklar ve yazılar hepsinin üstünde
    Efektler.ciz(ctx);
    ctx.restore();
  }

  /* Bu yerleştirme bir satır/sütunu tamamlayacaksa o çizgiyi vurgula */
  function vurguCiz(onizleme) {
    const gecici = new Set(onizleme.map(([r, s]) => r + "," + s));
    const dolu = (r, s) => tahta[r][s] !== null || gecici.has(r + "," + s);
    const en = IZGARA * hucre;

    ctx.save();
    ctx.fillStyle = "rgba(224, 87, 127, 0.3)";
    for (let r = 0; r < IZGARA; r++) {
      let tam = true;
      for (let s = 0; s < IZGARA; s++) if (!dolu(r, s)) { tam = false; break; }
      if (tam) ctx.fillRect(0, r * hucre, en, hucre);
    }
    for (let s = 0; s < IZGARA; s++) {
      let tam = true;
      for (let r = 0; r < IZGARA; r++) if (!dolu(r, s)) { tam = false; break; }
      if (tam) ctx.fillRect(s * hucre, 0, hucre, en);
    }
    ctx.restore();
  }

  function tepsiCiz() {
    // yeni gelen parçalar büyüyerek girsin
    let giris = 1;
    if (tepsiGiris > 0) {
      const t = 1 - tepsiGiris / TEPSI_GIRIS_SURESI;
      giris = 0.3 + Math.min(1, t * 1.25) * 0.7 + Math.sin(Math.min(1, t) * Math.PI) * 0.12;
    }

    for (let i = 0; i < TEPSI_ADET; i++) {
      const parca = tepsi[i];
      if (!parca) continue;
      if (suruklenen && suruklenen.slot === i) continue; // elde, tepside değil

      const kutu = yuvaKutusu(i);
      const enAdet = sekilEni(parca.sekil), boyAdet = sekilBoyu(parca.sekil);

      /* Parça yuvasına sığacak şekilde küçültülür — 5 hücrelik uzun
         parçalar yoksa tepsinin dışına taşıyordu. */
      const icPay = Math.round(tepsiHucre * 0.3);
      const b = Math.min(
        tepsiHucre,
        (kutu.en - icPay * 2) / enAdet,
        (kutu.boy - icPay * 2) / boyAdet
      );

      const pEn = enAdet * b, pBoy = boyAdet * b;
      const merkezX = kutu.x + kutu.en / 2, merkezY = kutu.y + kutu.boy / 2;

      // sığacak yeri kalmayan parçayı soluk göster
      const alfa = biryereSigarMi(parca.sekil) ? 1 : 0.32;

      ctx.save();
      ctx.translate(merkezX, merkezY);
      ctx.scale(giris, giris);
      ctx.translate(-pEn / 2, -pBoy / 2);
      for (let r = 0; r < parca.sekil.length; r++) {
        for (let s = 0; s < parca.sekil[r].length; s++) {
          if (parca.sekil[r][s]) blokCiz(ctx, s * b, r * b, b, parca.foto, alfa);
        }
      }
      ctx.restore();
    }
  }

  /* Elde tutulan parça: biraz büyük ve altında gölge — havada duruyor gibi */
  function suruklenenCiz() {
    const parca = tepsi[suruklenen.slot];
    const k = suruklenenKonum();
    const hucreler = [];
    for (let r = 0; r < parca.sekil.length; r++) {
      for (let s = 0; s < parca.sekil[r].length; s++) {
        if (parca.sekil[r][s]) hucreler.push([r, s]);
      }
    }

    ctx.save();
    ctx.translate(k.x + k.en / 2, k.y + k.boy / 2);
    ctx.scale(1.06, 1.06);
    ctx.translate(-k.en / 2, -k.boy / 2);

    // gölge (blokların altına)
    ctx.save();
    ctx.shadowColor = "rgba(120, 76, 92, 0.45)";
    ctx.shadowBlur = hucre * 0.5;
    ctx.shadowOffsetY = hucre * 0.2;
    ctx.fillStyle = "#fff";
    for (const [r, s] of hucreler) {
      yuvarlakYol(ctx, s * hucre + 2, r * hucre + 2, hucre - 4, hucre - 4, hucre * 0.17);
      ctx.fill();
    }
    ctx.restore();

    for (const [r, s] of hucreler) blokCiz(ctx, s * hucre, r * hucre, hucre, parca.foto);
    ctx.restore();
  }

  /* ------------------------- döngü ------------------------- */

  function guncelle(fark) {
    Efektler.guncelle(fark);

    if (yerlesme) {
      yerlesme.sayac -= fark;
      if (yerlesme.sayac <= 0) yerlesme = null;
    }
    if (tepsiGiris > 0) tepsiGiris -= fark;
    if (patlama) {
      patlama.sayac -= fark;
      if (patlama.sayac <= 0) patlamayiBitir();
    }
  }

  function dongu(zaman) {
    if (!aktif) return;
    const fark = Math.min(zaman - sonZaman || 0, 100);
    sonZaman = zaman;
    guncelle(fark);
    ciz();
    raf = requestAnimationFrame(dongu);
  }

  /* ------------------------- sürükleme ------------------------- */

  function tuvalKonumu(e) {
    const k = tuval.getBoundingClientRect();
    return { x: e.clientX - k.left - pay, y: e.clientY - k.top - pay };
  }

  function basildi(e) {
    if (bitti || patlama) return;
    Ses.uyandir();
    const { x, y } = tuvalKonumu(e);
    if (y < tepsiUst) return;

    const yuvaEni = (IZGARA * hucre) / TEPSI_ADET;
    const slot = Math.floor(x / yuvaEni);
    if (slot < 0 || slot >= TEPSI_ADET || !tepsi[slot]) return;

    e.preventDefault();
    try { tuval.setPointerCapture(e.pointerId); } catch { /* önemsiz */ }

    suruklenen = {
      slot,
      x, y,
      pointerId: e.pointerId,
      // dokunmatikte parça parmağın üstünde dursun ki görünsün
      yukariKaydir: e.pointerType === "touch",
    };
    Ses.tik();
  }

  function tasindi(e) {
    if (!suruklenen || e.pointerId !== suruklenen.pointerId) return;
    e.preventDefault();
    const { x, y } = tuvalKonumu(e);
    suruklenen.x = x;
    suruklenen.y = y;
  }

  function birakildi(e) {
    if (!suruklenen || (e.pointerId !== undefined && e.pointerId !== suruklenen.pointerId)) return;
    const { satir, sutun } = hedefHucre();
    const slot = suruklenen.slot;
    suruklenen = null;
    if (!yerlestir(slot, satir, sutun)) {
      Ses.hata();
    } else if (!patlama) {
      // Patlama varsa bitiş kontrolü patlama bitince yapılır; şimdi bakarsak
      // birazdan silinecek hücreleri dolu sayıp yanlışlıkla oyunu bitiririz.
      bitisKontrol();
    }
  }

  function iptal() {
    suruklenen = null;
  }

  /* ------------------------- dışa açılan ------------------------- */

  function yeniOyun() {
    tahta = bosTahta();
    skor = 0;
    kombo = 0;
    cicekVerildi = false;
    bitti = false;
    patlama = null;
    yerlesme = null;
    suruklenen = null;
    Efektler.temizle();
    tepsiyiDoldur();
    document.getElementById("blokKatman").classList.remove("acik");
    bilgiGuncelle();
    boyutlandir();
  }

  function baslat() {
    if (!kuruldu) {
      kuruldu = true;
      tuval = document.getElementById("blokTuval");
      ctx = tuval.getContext("2d");

      tuval.addEventListener("pointerdown", basildi);
      tuval.addEventListener("pointermove", tasindi);
      tuval.addEventListener("pointerup", birakildi);
      tuval.addEventListener("pointercancel", iptal);
      tuval.addEventListener("lostpointercapture", iptal);
      tuval.addEventListener("contextmenu", (e) => e.preventDefault());
      // parmak kalktığında hiçbir olay gelmezse bile elde parça kalmasın
      document.addEventListener("touchend", (e) => {
        if (e.touches && e.touches.length === 0 && suruklenen) iptal();
      });
      window.addEventListener("blur", iptal);

      document.getElementById("blokYeni").addEventListener("click", () => { Ses.tik(); yeniOyun(); });
      document.getElementById("blokKatmanDugme").addEventListener("click", () => { Ses.tik(); yeniOyun(); });
      window.addEventListener("resize", () => { if (aktif) boyutlandir(); });
    }

    const izgara = getComputedStyle(document.documentElement).getPropertyValue("--izgara").trim();
    if (izgara) izgaraRengi = izgara;

    aktif = true;
    yeniOyun();
    sonZaman = performance.now();
    raf = requestAnimationFrame(dongu);
  }

  function durdur() {
    aktif = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    suruklenen = null;
    Efektler.temizle();
  }

  function rekoruGetir() {
    return Kayit.al("blokRekor", 0);
  }

  return { baslat, durdur, rekoruGetir };
})();
