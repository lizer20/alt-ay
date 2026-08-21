/* =========================================================
   BAHÇE EKRANI
   Toplanan her şakayık, bahçeye dikilmiş gerçek bir çiçek olur.
   Sayı arttıkça bahçe dolar.
   ========================================================= */

const BahceEkrani = (() => {
  const EN_FAZLA_BITKI = 140;   // bundan sonrası çizilmez (kalabalık olmasın)

  const RENKLER = [
    { dis: "#d0577f", orta: "#e88ba8", ic: "#f7bfd2" },
    { dis: "#c74a72", orta: "#e07a9e", ic: "#f4b3c9" },
    { dis: "#dd7fa0", orta: "#eda3bc", ic: "#fbd2e0" },
    { dis: "#e9a0b8", orta: "#f2bccd", ic: "#fde6ee" },   // açık pembe
    { dis: "#e7dcd2", orta: "#f2ebe4", ic: "#fdfaf7" },   // krem şakayık
  ];

  let tuval, ctx, raf = null, aktif = false, sonZaman = 0, zaman = 0;
  let bitkiler = [];
  let cimenler = [];
  let kelebekler = [];
  let en = 800, boy = 500, ufuk = 0;
  const basOnbellek = new Map();

  /* Aynı çiçek her açılışta aynı yerde dursun diye tohumlu rastgelelik */
  function tohumlu(tohum) {
    let t = tohum + 0x6d2b79f5;
    return function () {
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------- sahne kurulumu ------------------------- */

  function bitkileriKur(adet) {
    bitkiler = [];
    const cizilecek = Math.min(adet, EN_FAZLA_BITKI);
    for (let i = 0; i < cizilecek; i++) {
      const r = tohumlu(i * 7919 + 13);
      // altın oran ile dağıtım: kümelenme olmadan doğal duruyor
      const x = ((i * 0.6180339887 + r() * 0.09) % 1);
      const derinlik = ((i * 0.3819660113 + r() * 0.12) % 1);
      bitkiler.push({
        x,
        derinlik,
        renk: RENKLER[Math.floor(r() * RENKLER.length)],
        faz: r() * Math.PI * 2,
        boyOran: 0.85 + r() * 0.3,
        yaprakYonu: r() < 0.5 ? -1 : 1,
      });
    }
    bitkiler.sort((a, b) => a.derinlik - b.derinlik);   // arkadan öne
  }

  function cimenleriKur() {
    cimenler = [];
    for (let i = 0; i < 260; i++) {
      const r = tohumlu(i * 104729 + 7);
      cimenler.push({
        x: r(),
        derinlik: ((i * 0.7548776662 + r() * 0.1) % 1),
        egim: (r() - 0.5) * 0.8,
        uzunluk: 0.6 + r() * 0.8,
        koyu: r() < 0.45,
        faz: r() * Math.PI * 2,
      });
    }
    cimenler.sort((a, b) => a.derinlik - b.derinlik);
  }

  function kelebekleriKur(adet) {
    kelebekler = [];
    for (let i = 0; i < adet; i++) {
      const r = tohumlu(i * 31337 + 5);
      kelebekler.push({
        merkezX: 0.2 + r() * 0.6,
        merkezY: 0.3 + r() * 0.3,
        genlikX: 0.08 + r() * 0.1,
        genlikY: 0.05 + r() * 0.06,
        hiz: 0.35 + r() * 0.3,
        faz: r() * Math.PI * 2,
        renk: r() < 0.5 ? "#f2bccd" : "#f0d18a",
      });
    }
  }

  /* ------------------------- çiçek başı (önbellekli) ------------------------- */

  /* Her çiçek başı tek tek çizilseydi 100+ çiçekte akıcılık düşerdi;
     boyut+renk başına bir kez çizip küçük tuval olarak saklıyoruz. */
  function cicekBasi(renk, capPx) {
    const cap = Math.max(8, Math.round(capPx));
    const anahtar = renk.dis + "|" + cap;
    if (basOnbellek.has(anahtar)) return basOnbellek.get(anahtar);

    const k = document.createElement("canvas");
    k.width = k.height = cap;
    const c = k.getContext("2d");
    const m = cap / 2;
    const o = cap / 100;   // 100 birimlik tasarımı ölçekle

    const yaprak = (sayi, rx, ry, cy, dolgu, aciKaydir) => {
      c.fillStyle = dolgu;
      for (let i = 0; i < sayi; i++) {
        c.save();
        c.translate(m, m);
        c.rotate((i / sayi) * Math.PI * 2 + aciKaydir);
        c.beginPath();
        c.ellipse(0, cy * o, rx * o, ry * o, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    };

    yaprak(8, 14, 22, -23, renk.dis, 0);
    yaprak(6, 11, 17, -16, renk.orta, 0.5);
    yaprak(5, 8, 12, -10, renk.ic, 0.2);

    c.fillStyle = "#e8b33f";
    c.beginPath();
    c.arc(m, m, 6.5 * o, 0, Math.PI * 2);
    c.fill();

    basOnbellek.set(anahtar, k);
    return k;
  }

  /* ------------------------- çizim ------------------------- */

  function gokyuzuCiz() {
    const gok = ctx.createLinearGradient(0, 0, 0, ufuk + boy * 0.1);
    gok.addColorStop(0, "#fdf3ec");
    gok.addColorStop(0.55, "#ffe6d9");
    gok.addColorStop(1, "#ffdfd2");
    ctx.fillStyle = gok;
    ctx.fillRect(0, 0, en, ufuk + boy * 0.12);

    // güneş parıltısı
    const g = ctx.createRadialGradient(en * 0.78, ufuk * 0.34, 0, en * 0.78, ufuk * 0.34, boy * 0.42);
    g.addColorStop(0, "rgba(255, 236, 190, 0.85)");
    g.addColorStop(1, "rgba(255, 236, 190, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, en, ufuk + boy * 0.12);

    // uzaktaki tepeler
    const tepe = (yukseklik, renk, kaydir) => {
      ctx.fillStyle = renk;
      ctx.beginPath();
      ctx.moveTo(-20, ufuk + 4);
      for (let x = -20; x <= en + 20; x += 12) {
        const y = ufuk - yukseklik * (0.55 + 0.45 * Math.sin((x / en) * 3.1 + kaydir));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(en + 20, ufuk + 4);
      ctx.closePath();
      ctx.fill();
    };
    tepe(boy * 0.13, "#cfdcc0", 0.6);
    tepe(boy * 0.08, "#bcd0aa", 2.4);
  }

  function zeminCiz() {
    const z = ctx.createLinearGradient(0, ufuk, 0, boy);
    z.addColorStop(0, "#a9c98d");
    z.addColorStop(0.5, "#96bb78");
    z.addColorStop(1, "#7ea862");
    ctx.fillStyle = z;
    ctx.fillRect(0, ufuk, en, boy - ufuk);

    // yumuşak ışık lekeleri
    ctx.fillStyle = "rgba(255, 246, 214, 0.16)";
    for (let i = 0; i < 5; i++) {
      const r = tohumlu(i * 5077 + 3);
      const cx = r() * en, cy = ufuk + r() * (boy - ufuk);
      ctx.beginPath();
      ctx.ellipse(cx, cy, en * 0.16, (boy - ufuk) * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function cimenCiz(c) {
    const y = ufuk + c.derinlik * (boy - ufuk) * 0.98;
    const olcek = 0.4 + c.derinlik * 0.9;
    const uzun = 16 * olcek * c.uzunluk;
    const salinim = Math.sin(zaman * 1.4 + c.faz) * 2.5 * olcek;
    ctx.strokeStyle = c.koyu ? "rgba(90, 130, 68, 0.75)" : "rgba(130, 172, 96, 0.75)";
    ctx.lineWidth = Math.max(1, 1.6 * olcek);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(c.x * en, y);
    ctx.quadraticCurveTo(
      c.x * en + c.egim * uzun * 0.5 + salinim * 0.5, y - uzun * 0.6,
      c.x * en + c.egim * uzun + salinim, y - uzun
    );
    ctx.stroke();
  }

  function bitkiCiz(b) {
    const tabanY = ufuk + b.derinlik * (boy - ufuk) * 0.96 + (boy - ufuk) * 0.02;
    const olcek = (0.45 + b.derinlik * 0.75) * b.boyOran * (boy / 500);
    const sapBoyu = 92 * olcek;
    const salinim = Math.sin(zaman * 1.05 + b.faz) * 5 * olcek;
    const x = b.x * en;
    const tepeX = x + salinim;
    const tepeY = tabanY - sapBoyu;

    // sap
    ctx.strokeStyle = "#6f9c56";
    ctx.lineWidth = Math.max(1.4, 3.1 * olcek);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, tabanY);
    ctx.quadraticCurveTo(x + salinim * 0.35, tabanY - sapBoyu * 0.55, tepeX, tepeY);
    ctx.stroke();

    // iki yaprak
    ctx.fillStyle = "#659150";
    for (const yon of [b.yaprakYonu, -b.yaprakYonu]) {
      const yy = tabanY - sapBoyu * (yon === b.yaprakYonu ? 0.42 : 0.26);
      const yx = x + salinim * (yon === b.yaprakYonu ? 0.25 : 0.15);
      ctx.save();
      ctx.translate(yx, yy);
      ctx.rotate(yon * 0.65);
      ctx.beginPath();
      ctx.ellipse(yon * 11 * olcek, 0, 12 * olcek, 4.6 * olcek, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // çiçek başı
    const cap = 46 * olcek;
    const bas = cicekBasi(b.renk, cap);
    ctx.drawImage(bas, tepeX - cap / 2, tepeY - cap / 2, cap, cap);
  }

  function kelebekCiz(k) {
    const t = zaman * k.hiz + k.faz;
    const x = (k.merkezX + Math.sin(t) * k.genlikX) * en;
    const y = (k.merkezY + Math.sin(t * 2) * k.genlikY) * boy;
    const kanat = Math.abs(Math.sin(zaman * 9 + k.faz));
    const b = Math.max(4, boy * 0.016);

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = k.renk;
    for (const yon of [-1, 1]) {
      ctx.save();
      ctx.scale(yon * (0.35 + kanat * 0.65), 1);
      ctx.beginPath();
      ctx.ellipse(b * 0.8, 0, b, b * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#7a5a48";
    ctx.beginPath();
    ctx.ellipse(0, 0, b * 0.18, b * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function ciz() {
    if (!ctx) return;
    ctx.clearRect(0, 0, en, boy);
    gokyuzuCiz();
    zeminCiz();

    // çimen ve çiçekler derinliğe göre iç içe çizilir
    let ci = 0;
    for (const b of bitkiler) {
      while (ci < cimenler.length && cimenler[ci].derinlik <= b.derinlik) cimenCiz(cimenler[ci++]);
      bitkiCiz(b);
    }
    while (ci < cimenler.length) cimenCiz(cimenler[ci++]);

    for (const k of kelebekler) kelebekCiz(k);
  }

  /* ------------------------- boyut / döngü ------------------------- */

  function boyutlandir() {
    if (!tuval) return;
    const kapsayici = tuval.parentElement;
    en = Math.max(280, Math.min(kapsayici.clientWidth || 800, 900));
    boy = Math.round(Math.min(Math.max(en * 0.62, 300), window.innerHeight * 0.62));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    tuval.style.width = en + "px";
    tuval.style.height = boy + "px";
    tuval.width = Math.round(en * dpr);
    tuval.height = Math.round(boy * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ufuk = Math.round(boy * 0.42);
    basOnbellek.clear();     // boyut değişti, önbellek geçersiz
    ciz();
  }

  function dongu(t) {
    if (!aktif) return;
    const fark = Math.min(t - sonZaman || 0, 100);
    sonZaman = t;
    zaman += fark / 1000;
    ciz();
    raf = requestAnimationFrame(dongu);
  }

  /* ------------------------- dışa açılan ------------------------- */

  function baslat() {
    if (!tuval) {
      tuval = document.getElementById("bahceTuval");
      ctx = tuval.getContext("2d");
      window.addEventListener("resize", () => { if (aktif) boyutlandir(); });
    }

    const adet = Bahce.sayi();
    bitkileriKur(adet);
    cimenleriKur();
    kelebekleriKur(adet === 0 ? 1 : Math.min(3, 1 + Math.floor(adet / 6)));

    document.getElementById("bahceEkranSayi").textContent = adet;
    const bosYazi = document.getElementById("bahceBosYazi");
    bosYazi.style.display = adet === 0 ? "block" : "none";
    document.getElementById("bahceAltNot").textContent = altNot(adet);

    aktif = true;
    boyutlandir();
    sonZaman = performance.now();
    raf = requestAnimationFrame(dongu);
  }

  function altNot(adet) {
    if (adet === 0) return "Bir oyun kazandığında buraya ilk şakayık dikilecek.";
    if (adet > EN_FAZLA_BITKI) {
      return `${adet} şakayık topladık — bahçeye ${EN_FAZLA_BITKI} tanesi sığdı, gerisi taştı 🌸`;
    }
    if (adet < 5) return `${adet} şakayık. Bahçe daha yeni filizleniyor.`;
    if (adet < 15) return `${adet} şakayık. Güzelleşmeye başladı.`;
    if (adet < 40) return `${adet} şakayık. Artık gerçek bir bahçe.`;
    return `${adet} şakayık. Buranın altında piknik yapılır.`;
  }

  function durdur() {
    aktif = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  return { baslat, durdur };
})();
