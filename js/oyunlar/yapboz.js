/* =========================================================
   YAPBOZ
   Bir fotoğraf seç, parçalara ayrılsın; iki parçaya tıklayıp yer değiştir.
   ========================================================= */

const Yapboz = (() => {
  let tahta, onizleme, serit;
  let n = Kayit.al("yapbozBoyut", 3);
  let fotoIdx = 0;
  let dizilim = [];        // dizilim[hucre] = o hücrede duran parçanın doğru sırası
  let secili = -1;
  let hamle = 0;
  let baslangic = 0, sayacId = null, oynaniyor = false;
  let kuruldu = false;

  function parcaKonumu(k) {
    const satir = Math.floor(k / n), sutun = k % n;
    const x = n === 1 ? 0 : (sutun / (n - 1)) * 100;
    const y = n === 1 ? 0 : (satir / (n - 1)) * 100;
    return `${x}% ${y}%`;
  }

  function cozulduMu() {
    return dizilim.every((p, i) => p === i);
  }

  function dogruSayisi() {
    return dizilim.reduce((t, p, i) => t + (p === i ? 1 : 0), 0);
  }

  function sayacBaslat() {
    if (sayacId) return;
    baslangic = performance.now();
    sayacId = setInterval(() => {
      document.getElementById("yapbozSure").textContent = sureMetni(performance.now() - baslangic);
    }, 250);
  }

  function sayacDurdur() {
    if (sayacId) clearInterval(sayacId);
    sayacId = null;
  }

  function bilgiGuncelle() {
    document.getElementById("yapbozHamle").textContent = hamle;
    document.getElementById("yapbozDogru").textContent = `${dogruSayisi()}/${n * n}`;
  }

  function tahtaCiz() {
    tahta.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    tahta.classList.remove("tamam");
    tahta.innerHTML = "";

    dizilim.forEach((parcaNo, hucre) => {
      const p = document.createElement("div");
      p.className = "parca";
      p.style.backgroundImage = `url("${FOTOLAR[fotoIdx].kare}")`;
      p.style.backgroundSize = `${n * 100}% ${n * 100}%`;
      p.style.backgroundPosition = parcaKonumu(parcaNo);
      p.dataset.hucre = hucre;
      p.addEventListener("click", () => parcaTikla(hucre));
      tahta.appendChild(p);
    });
    bilgiGuncelle();
  }

  function parcaTikla(hucre) {
    Ses.uyandir();
    if (!oynaniyor) return;
    sayacBaslat();

    const parcalar = tahta.children;

    if (secili === -1) {
      secili = hucre;
      parcalar[hucre].classList.add("secili");
      Ses.tik();
      return;
    }

    if (secili === hucre) {
      parcalar[hucre].classList.remove("secili");
      secili = -1;
      Ses.tik();
      return;
    }

    // yer değiştir
    [dizilim[secili], dizilim[hucre]] = [dizilim[hucre], dizilim[secili]];
    parcalar[secili].style.backgroundPosition = parcaKonumu(dizilim[secili]);
    parcalar[hucre].style.backgroundPosition = parcaKonumu(dizilim[hucre]);
    parcalar[secili].classList.remove("secili");
    secili = -1;
    hamle++;
    Ses.kaydir();
    bilgiGuncelle();

    if (cozulduMu()) kazandin();
  }

  function kazandin() {
    oynaniyor = false;
    sayacDurdur();
    tahta.classList.add("tamam");
    Ses.kazandin();
    const sure = performance.now() - baslangic;

    const anahtar = `yapbozRekor${n}`;
    const eski = Kayit.al(anahtar, null);
    const yeniRekor = !eski || sure < eski.sure;
    if (yeniRekor) Kayit.yaz(anahtar, { sure, hamle });

    document.getElementById("yapbozKatmanMetin").textContent =
      `${n}×${n} · ${sureMetni(sure)} · ${hamle} hamle` + (yeniRekor ? " · yeni rekor! 🏆" : "");
    setTimeout(() => document.getElementById("yapbozKatman").classList.add("acik"), 700);
  }

  function karistirVeBasla() {
    document.getElementById("yapbozKatman").classList.remove("acik");
    sayacDurdur();
    document.getElementById("yapbozSure").textContent = "00:00";
    hamle = 0;
    secili = -1;
    oynaniyor = true;

    const toplam = n * n;
    do {
      dizilim = karistir(Array.from({ length: toplam }, (_, i) => i));
    } while (cozulduMu());

    onizleme.src = FOTOLAR[fotoIdx].kare;
    tahtaCiz();
  }

  function seritCiz() {
    serit.innerHTML = "";
    FOTOLAR.forEach((f, i) => {
      const img = document.createElement("img");
      img.src = f.tile;
      img.alt = "Fotoğraf " + f.no;
      img.loading = "lazy";
      img.classList.toggle("secili", i === fotoIdx);
      img.addEventListener("click", () => {
        fotoIdx = i;
        Kayit.yaz("yapbozFoto", i);
        Ses.tik();
        [...serit.children].forEach((c, j) => c.classList.toggle("secili", j === i));
        karistirVeBasla();
      });
      serit.appendChild(img);
    });
  }

  function zorlukDugmeleri() {
    document.querySelectorAll("#yapbozZorluk .dugme").forEach((d) => {
      d.classList.toggle("secili", Number(d.dataset.n) === n);
    });
  }

  function baslat() {
    tahta = document.getElementById("yapbozTahta");
    onizleme = document.getElementById("yapbozOnizleme");
    serit = document.getElementById("fotoSeridi");

    if (!kuruldu) {
      kuruldu = true;
      fotoIdx = Math.min(Kayit.al("yapbozFoto", 0), FOTOLAR.length - 1);

      document.getElementById("yapbozKaristir").addEventListener("click", () => { Ses.tik(); karistirVeBasla(); });
      document.getElementById("yapbozKatmanDugme").addEventListener("click", () => {
        Ses.tik();
        fotoIdx = rastgele(FOTOLAR.length);
        [...serit.children].forEach((c, j) => c.classList.toggle("secili", j === fotoIdx));
        karistirVeBasla();
      });
      document.querySelectorAll("#yapbozZorluk .dugme").forEach((d) => {
        d.addEventListener("click", () => {
          n = Number(d.dataset.n);
          Kayit.yaz("yapbozBoyut", n);
          zorlukDugmeleri();
          Ses.tik();
          karistirVeBasla();
        });
      });
    }

    seritCiz();
    zorlukDugmeleri();
    karistirVeBasla();
  }

  function durdur() {
    oynaniyor = false;
    sayacDurdur();
  }

  function rekorMetni() {
    const r = Kayit.al(`yapbozRekor${n}`, null);
    return r ? sureMetni(r.sure) : null;
  }

  return { baslat, durdur, rekorMetni };
})();
