/* =========================================================
   UYGULAMA — menü, sayfa geçişleri, ses düğmeleri
   ========================================================= */

const OYUNLAR = {
  tetris: Tetris,
  hafiza: Hafiza,
  yapboz: Yapboz,
};

let acikSayfa = "menu";

/* ------------------------- sayfa geçişi ------------------------- */

function sayfaAc(ad) {
  if (ad === acikSayfa) return;

  const eski = OYUNLAR[acikSayfa];
  if (eski && eski.durdur) eski.durdur();

  document.querySelectorAll(".sayfa").forEach((s) => s.classList.remove("acik"));
  const hedef = document.getElementById("sayfa-" + ad);
  if (!hedef) return sayfaAc("menu");
  hedef.classList.add("acik");

  acikSayfa = ad;
  document.body.classList.toggle("oyunda", ad !== "menu");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

  const yeni = OYUNLAR[ad];
  if (yeni && yeni.baslat) yeni.baslat();
  if (ad === "menu") rozetleriGuncelle();

  const yeniHash = ad === "menu" ? "" : "#" + ad;
  if (location.hash !== yeniHash) history.replaceState(null, "", yeniHash || location.pathname);
}

/* ------------------------- menü süsleri ------------------------- */

function kalbiCalistir() {
  const cerceve = document.getElementById("kalpCerceve");
  const sira = karistir(FOTOLAR.map((_, i) => i));
  let konum = 0;

  const a = document.createElement("img");
  const b = document.createElement("img");
  a.alt = b.alt = "";
  cerceve.append(a, b);

  a.src = FOTOLAR[sira[0]].kare;
  a.classList.add("gorunur");
  let aktifOlan = a, bekleyen = b;

  setInterval(() => {
    konum = (konum + 1) % sira.length;
    bekleyen.src = FOTOLAR[sira[konum]].kare;
    bekleyen.classList.add("gorunur");
    aktifOlan.classList.remove("gorunur");
    [aktifOlan, bekleyen] = [bekleyen, aktifOlan];
  }, AYARLAR.heroDegisimSn * 1000);
}

function onizlemeleriDoldur() {
  document.querySelectorAll(".onizleme").forEach((kutu) => {
    const adet = Number(kutu.dataset.foto) || 4;
    const secilen = karistir(FOTOLAR.map((_, i) => i)).slice(0, adet);
    secilen.forEach((i) => {
      const img = document.createElement("img");
      img.src = FOTOLAR[i].tile;
      img.alt = "";
      kutu.appendChild(img);
    });
  });
}

function kalpYagdir() {
  const kap = document.getElementById("kalpler");
  const simgeler = ["💗", "💖", "💘", "🤍", "💞"];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.textContent = simgeler[rastgele(simgeler.length)];
    s.style.left = rastgele(100) + "%";
    s.style.fontSize = 12 + rastgele(20) + "px";
    s.style.animationDuration = 16 + rastgele(18) + "s";
    s.style.animationDelay = -rastgele(30) + "s";
    kap.appendChild(s);
  }
}

function rozetleriGuncelle() {
  const t = Tetris.rekoruGetir();
  document.getElementById("rozetTetris").textContent = t ? "rekor " + t : "yeni";

  const h = Hafiza.rekorMetni();
  document.getElementById("rozetHafiza").textContent = h ? "rekor " + h : "yeni";

  const y = Yapboz.rekorMetni();
  document.getElementById("rozetYapboz").textContent = y ? "rekor " + y : "yeni";
}

/* ------------------------- kurulum ------------------------- */

function kurulum() {
  document.title = `${AYARLAR.baslik} — Oyun Salonu`;
  document.getElementById("marka").textContent = AYARLAR.baslik;
  document.getElementById("anaBaslik").textContent = AYARLAR.baslik;
  document.getElementById("altYazi").textContent = AYARLAR.altYazi;
  document.querySelector(".dip-not").textContent =
    `${FOTOLAR.length} fotoğraf · ok tuşları veya dokunmatik · her şey bu klasörde 💞`;

  kalpYagdir();
  onizlemeleriDoldur();
  kalbiCalistir();
  rozetleriGuncelle();

  document.querySelectorAll(".oyun-kart").forEach((kart) => {
    kart.addEventListener("click", () => {
      Ses.uyandir();
      Ses.tik();
      sayfaAc(kart.dataset.oyun);
    });
  });

  document.getElementById("geriDugmesi").addEventListener("click", () => {
    Ses.tik();
    sayfaAc("menu");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && acikSayfa !== "menu") sayfaAc("menu");
  });

  /* ses */
  Ses.muzikKur(document.getElementById("arkaMuzik"));
  Ses.arayuzuGuncelle();
  document.getElementById("muzikDugmesi").addEventListener("click", () => {
    Ses.uyandir();
    Ses.muzikAcKapa();
  });
  document.getElementById("efektDugmesi").addEventListener("click", () => {
    Ses.uyandir();
    Ses.efektAcKapa();
  });
  document.addEventListener("pointerdown", () => Ses.uyandir(), { once: true });

  /* adres çubuğundaki #tetris gibi bir bağlantıyla açıldıysa oraya git */
  const hash = location.hash.replace("#", "");
  if (OYUNLAR[hash]) sayfaAc(hash);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", kurulum);
} else {
  kurulum();
}
