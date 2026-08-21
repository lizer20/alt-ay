/* =========================================================
   UYGULAMA — menü, sayfa geçişleri, ses düğmeleri
   ========================================================= */

const OYUNLAR = {
  tetris: Tetris,
  hafiza: Hafiza,
  yapboz: Yapboz,
  blokpatlat: BlokPatlat,
  bahce: BahceEkrani,
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

/* Arka planda usulca yükselen polaroid fotoğraflar.
   Küçük "tile" görselleri kullanılıyor (zaten yüklü), ek yük getirmiyor. */
function polaroidleriSerp() {
  const kap = document.getElementById("arkaPlan");
  const darEkran = window.innerWidth < 700;
  const adet = Math.min(darEkran ? 6 : 10, FOTOLAR.length);
  const secilen = karistir(FOTOLAR.map((_, i) => i)).slice(0, adet);

  secilen.forEach((fotoIdx, i) => {
    const en = (darEkran ? 42 : 52) + rastgele(darEkran ? 30 : 46);
    const cerceve = Math.round(en * 0.07) + 2;

    const p = document.createElement("div");
    p.className = "polaroid";
    p.style.width = en + "px";
    // polaroid oranı: alt kenar kalın (fotoğrafın altındaki boş şerit)
    p.style.padding = `${cerceve}px ${cerceve}px ${Math.round(cerceve * 3.2)}px`;
    // ekrana eşit dağılsınlar, sonra biraz rastgelelik
    p.style.left = Math.round((i / adet) * 100 + rastgele(8)) + "%";
    // hep gözle görülür bir eğim olsun (düz duran polaroid sırıtıyor)
    const yon = rastgele(2) ? 1 : -1;
    p.style.setProperty("--egim", yon * (3 + rastgele(9)) + "deg");
    p.style.setProperty("--kayma", (rastgele(60) - 30) + "px");
    p.style.setProperty("--parlaklik", (0.36 + rastgele(18) / 100).toFixed(2));
    p.style.animationDuration = 34 + rastgele(26) + "s";
    p.style.animationDelay = -rastgele(50) + "s";

    const img = document.createElement("img");
    img.src = FOTOLAR[fotoIdx].tile;
    img.alt = "";
    p.appendChild(img);
    kap.appendChild(p);
  });
}

function rozetleriGuncelle() {
  const t = Tetris.rekoruGetir();
  document.getElementById("rozetTetris").textContent = t ? "rekor " + t : "yeni";

  const h = Hafiza.rekorMetni();
  document.getElementById("rozetHafiza").textContent = h ? "rekor " + h : "yeni";

  const y = Yapboz.rekorMetni();
  document.getElementById("rozetYapboz").textContent = y ? "rekor " + y : "yeni";

  const b = BlokPatlat.rekoruGetir();
  document.getElementById("rozetBlok").textContent = b ? "rekor " + b : "yeni";
}

/* ------------------------- kurulum ------------------------- */

function kurulum() {
  document.title = `${AYARLAR.baslik} — Oyun Salonu`;
  document.getElementById("marka").textContent = AYARLAR.baslik;
  document.getElementById("anaBaslik").textContent = AYARLAR.baslik;
  document.getElementById("altYazi").textContent = AYARLAR.altYazi;
  document.querySelector(".dip-not").textContent =
    `${FOTOLAR.length} fotoğraf · ok tuşları veya dokunmatik · her şey bu klasörde 💞`;

  polaroidleriSerp();
  onizlemeleriDoldur();
  kalbiCalistir();
  rozetleriGuncelle();
  Bahce.arayuzuGuncelle();

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

  /* Şakayıklara basınca bahçe açılır */
  const bahceyiAc = () => { Ses.uyandir(); Ses.tik(); sayfaAc("bahce"); };
  document.getElementById("bahceSayac").addEventListener("click", bahceyiAc);
  const bahceKart = document.getElementById("bahceKart");
  bahceKart.addEventListener("click", bahceyiAc);
  bahceKart.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bahceyiAc(); }
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
