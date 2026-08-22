/* =========================================================
   HAFIZA KARTLARI
   Aynı fotoğrafın iki kopyasını bul.
   ========================================================= */

/* Oyun başında kartların ezberlemek için açık kaldığı süre (ms) */
const HAFIZA_ONIZLEME_SURESI = 4000;

const Hafiza = (() => {
  let tahta, ciftSayisi = Kayit.al("hafizaZorluk", 8);
  let acikKartlar = [];
  let kilit = false;
  let hamle = 0, bulunan = 0;
  let baslangic = 0, sayacId = null, oynaniyor = false;
  let kuruldu = false;

  const zorlukAdi = { 6: "Kolay", 8: "Orta", 12: "Zor" };

  function sutunSayisi() {
    if (ciftSayisi <= 8) return 4;
    return window.innerWidth < 620 ? 4 : 6;
  }

  function rekorAnahtari() { return "hafizaRekor" + ciftSayisi; }

  function rekorGuncelle() {
    const r = Kayit.al(rekorAnahtari(), null);
    document.getElementById("hafizaRekor").textContent = r ? sureMetni(r.sure) : "—";
  }

  function zorlukDugmeleri() {
    document.querySelectorAll("#hafizaZorluk .dugme").forEach((d) => {
      d.classList.toggle("secili", Number(d.dataset.cift) === ciftSayisi);
    });
  }

  function sayacBaslat() {
    if (sayacId) return;
    baslangic = performance.now();
    sayacId = setInterval(() => {
      document.getElementById("hafizaSure").textContent = sureMetni(performance.now() - baslangic);
    }, 250);
  }

  function sayacDurdur() {
    if (sayacId) clearInterval(sayacId);
    sayacId = null;
  }

  function bilgiGuncelle() {
    document.getElementById("hafizaHamle").textContent = hamle;
    document.getElementById("hafizaBulunan").textContent = `${bulunan}/${ciftSayisi}`;
  }

  function kartOlustur(fotoIdx, sira) {
    const dugme = document.createElement("button");
    dugme.className = "kart";
    dugme.dataset.foto = fotoIdx;
    dugme.style.animationDelay = sira * 0.03 + "s";

    const arka = document.createElement("div");
    arka.className = "yuz arka";
    arka.textContent = "💖";

    const on = document.createElement("div");
    on.className = "yuz on";
    const img = document.createElement("img");
    img.src = FOTOLAR[fotoIdx].kare;
    img.alt = "";
    img.loading = "lazy";
    on.appendChild(img);

    dugme.append(arka, on);
    dugme.addEventListener("click", () => kartTikla(dugme));
    return dugme;
  }

  function kartTikla(kart) {
    Ses.uyandir();
    if (kilit || !oynaniyor) return;
    if (kart.classList.contains("acik") || kart.classList.contains("eslesti")) return;

    sayacBaslat();
    kart.classList.add("acik");
    Ses.tik();
    acikKartlar.push(kart);

    if (acikKartlar.length < 2) return;

    hamle++;
    bilgiGuncelle();
    const [a, b] = acikKartlar;

    if (a.dataset.foto === b.dataset.foto) {
      acikKartlar = [];
      bulunan++;
      setTimeout(() => {
        a.classList.add("eslesti");
        b.classList.add("eslesti");
        a.classList.remove("acik");
        b.classList.remove("acik");
        Ses.eslesme();
        bilgiGuncelle();
        if (bulunan === ciftSayisi) kazandin();
      }, 260);
    } else {
      kilit = true;
      setTimeout(() => {
        a.classList.remove("acik");
        b.classList.remove("acik");
        acikKartlar = [];
        kilit = false;
        Ses.hata();
      }, 780);
    }
  }

  function kazandin() {
    oynaniyor = false;
    sayacDurdur();
    const sure = performance.now() - baslangic;
    Ses.kazandin();

    const eski = Kayit.al(rekorAnahtari(), null);
    const yeniRekor = !eski || sure < eski.sure;
    if (yeniRekor) Kayit.yaz(rekorAnahtari(), { sure, hamle });
    rekorGuncelle();
    Bahce.topla("hafiza");

    document.getElementById("hafizaKatmanMetin").textContent =
      `${zorlukAdi[ciftSayisi]} · ${sureMetni(sure)} · ${hamle} hamle` +
      (yeniRekor ? " · yeni rekor! 🏆" : "");
    document.getElementById("hafizaKatman").classList.add("acik");
  }

  function yeniOyun() {
    tahta = document.getElementById("hafizaTahta");
    document.getElementById("hafizaKatman").classList.remove("acik");
    sayacDurdur();

    hamle = 0; bulunan = 0; acikKartlar = []; kilit = false;
    oynaniyor = true;
    document.getElementById("hafizaSure").textContent = "00:00";
    bilgiGuncelle();
    rekorGuncelle();
    zorlukDugmeleri();

    // fotoğrafları seç ve ikişer kez koy
    const secilen = karistir(FOTOLAR.map((_, i) => i)).slice(0, ciftSayisi);
    const deste = karistir([...secilen, ...secilen]);

    tahta.style.gridTemplateColumns = `repeat(${sutunSayisi()}, 1fr)`;
    tahta.innerHTML = "";
    deste.forEach((fotoIdx, i) => tahta.appendChild(kartOlustur(fotoIdx, i)));

    // ezberleme süresi: kartlar bir süre açık başlasın
    const kartlar = [...tahta.children];
    kartlar.forEach((k) => k.classList.add("acik"));
    kilit = true;
    setTimeout(() => {
      kartlar.forEach((k) => k.classList.remove("acik"));
      kilit = false;
    }, HAFIZA_ONIZLEME_SURESI);
  }

  function baslat() {
    if (!kuruldu) {
      kuruldu = true;
      document.getElementById("hafizaYeni").addEventListener("click", () => { Ses.tik(); yeniOyun(); });
      document.getElementById("hafizaKatmanDugme").addEventListener("click", () => { Ses.tik(); yeniOyun(); });
      document.querySelectorAll("#hafizaZorluk .dugme").forEach((d) => {
        d.addEventListener("click", () => {
          ciftSayisi = Number(d.dataset.cift);
          Kayit.yaz("hafizaZorluk", ciftSayisi);
          Ses.tik();
          yeniOyun();
        });
      });
      window.addEventListener("resize", () => {
        if (tahta && document.getElementById("sayfa-hafiza").classList.contains("acik")) {
          tahta.style.gridTemplateColumns = `repeat(${sutunSayisi()}, 1fr)`;
        }
      });
    }
    yeniOyun();
  }

  function durdur() {
    oynaniyor = false;
    sayacDurdur();
  }

  function rekorMetni() {
    const r = Kayit.al("hafizaRekor" + ciftSayisi, null);
    return r ? sureMetni(r.sure) : null;
  }

  return { baslat, durdur, rekorMetni };
})();
