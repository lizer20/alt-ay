/* =========================================================
   ŞAKAYIK BAHÇESİ
   Her kazanılan oyun bahçeye bir şakayık ekliyor.

   Kazanma koşulları:
     Hafıza      → bütün çiftleri bul
     Yapboz      → yapbozu tamamla
     Tetris      → 3. seviyeye ulaş (20 satır)
     Blok Patlat → 2000 puana ulaş
   ========================================================= */

const BLOK_CICEK_HEDEFI = 2000;   // Blok Patlat'ta şakayık için gereken puan
const TETRIS_CICEK_HEDEFI = 3;    // Tetris'te şakayık için gereken seviye

const Bahce = (() => {
  const OYUN_ADLARI = {
    tetris: "Tetris",
    blokpatlat: "Blok Patlat",
    hafiza: "Hafıza Kartları",
    yapboz: "Yapboz",
  };

  const EN_FAZLA_GOSTER = 48;   // bahçede tek tek gösterilecek çiçek sayısı

  let veri = Kayit.al("bahce", null);
  if (!veri || typeof veri.toplam !== "number") veri = { toplam: 0, oyunlar: {} };
  if (!veri.oyunlar) veri.oyunlar = {};

  /* ---------------- şakayık çizimi (SVG) ---------------- */

  function sakayik(boyut = 40, solgun = false) {
    const dis = solgun ? "#e6d3da" : "#d9628c";
    const orta = solgun ? "#eddfe4" : "#ef8fae";
    const ic = solgun ? "#f4ebee" : "#fbc0d3";
    const goz = solgun ? "#e8dcc9" : "#e8b33f";

    let yapraklar = "";
    for (let i = 0; i < 8; i++) {
      yapraklar += `<ellipse cx="50" cy="27" rx="14" ry="22" fill="${dis}" transform="rotate(${i * 45} 50 50)"/>`;
    }
    for (let i = 0; i < 6; i++) {
      yapraklar += `<ellipse cx="50" cy="34" rx="11" ry="17" fill="${orta}" transform="rotate(${i * 60 + 30} 50 50)"/>`;
    }
    for (let i = 0; i < 5; i++) {
      yapraklar += `<ellipse cx="50" cy="40" rx="8" ry="12" fill="${ic}" transform="rotate(${i * 72} 50 50)"/>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" class="sakayik" viewBox="0 0 100 100" width="${boyut}" height="${boyut}" aria-hidden="true">
      ${yapraklar}<circle cx="50" cy="50" r="6.5" fill="${goz}"/></svg>`;
  }

  /* ---------------- toplama ---------------- */

  function sayi() { return veri.toplam; }

  function topla(oyun) {
    veri.toplam++;
    veri.oyunlar[oyun] = (veri.oyunlar[oyun] || 0) + 1;
    Kayit.yaz("bahce", veri);
    arayuzuGuncelle();
    Ses.cicek();
    kutla(oyun);
  }

  function kutla(oyun) {
    const eski = document.querySelector(".bahce-bildirim");
    if (eski) eski.remove();

    const kutu = document.createElement("div");
    kutu.className = "bahce-bildirim";
    kutu.innerHTML = `
      ${sakayik(46)}
      <div>
        <b>Bir şakayık daha!</b>
        <span>${OYUN_ADLARI[oyun] || "Oyun"} kazanıldı · bahçede ${veri.toplam} şakayık</span>
      </div>`;
    document.body.appendChild(kutu);
    setTimeout(() => kutu.remove(), 3600);
  }

  /* ---------------- arayüz ---------------- */

  function arayuzuGuncelle() {
    const sayac = document.getElementById("bahceSayac");
    if (sayac) {
      const oncekiDeger = sayac.dataset.deger;
      sayac.innerHTML = sakayik(20) + `<span>${veri.toplam}</span>`;
      if (oncekiDeger !== undefined && Number(oncekiDeger) !== veri.toplam) {
        sayac.classList.remove("artti");
        void sayac.offsetWidth;          // animasyonu yeniden başlat
        sayac.classList.add("artti");
      }
      sayac.dataset.deger = veri.toplam;
      sayac.title = `Bahçede ${veri.toplam} şakayık`;
    }

    const toplam = document.getElementById("bahceToplam");
    if (toplam) toplam.textContent = veri.toplam;

    const kap = document.getElementById("bahceCicekler");
    if (kap) {
      const gosterilecek = Math.min(veri.toplam, EN_FAZLA_GOSTER);
      let html = "";
      if (veri.toplam === 0) {
        // boş bahçe: soluk çiçek gölgeleri
        for (let i = 0; i < 5; i++) html += `<span class="cicek bos">${sakayik(38, true)}</span>`;
      } else {
        for (let i = 0; i < gosterilecek; i++) {
          html += `<span class="cicek" style="animation-delay:${i * 0.045}s">${sakayik(38)}</span>`;
        }
        if (veri.toplam > EN_FAZLA_GOSTER) {
          html += `<span class="cicek-fazla">+${veri.toplam - EN_FAZLA_GOSTER}</span>`;
        }
      }
      kap.innerHTML = html;
    }

    const not = document.getElementById("bahceNot");
    if (not) {
      if (veri.toplam === 0) {
        not.textContent = "Bahçe henüz boş. İlk oyunu kazandığında ilk şakayık açacak.";
      } else {
        const dokum = Object.keys(veri.oyunlar)
          .filter((o) => veri.oyunlar[o] > 0)
          .map((o) => `${OYUN_ADLARI[o] || o}: ${veri.oyunlar[o]}`)
          .join(" · ");
        not.textContent = dokum;
      }
    }
  }

  /* Oyun sayfalarındaki hedef şeridi */
  function hedefGuncelle(id, metin, oran, tamam) {
    const serit = document.getElementById(id);
    if (!serit) return;
    const simge = serit.querySelector(".cicek-simge");
    if (simge && !simge.innerHTML) simge.innerHTML = sakayik(20);
    serit.querySelector(".metin").textContent = metin;
    const dolgu = serit.querySelector(".dolgu");
    if (dolgu) dolgu.style.width = Math.min(100, Math.round(oran * 100)) + "%";
    serit.classList.toggle("tamam", !!tamam);
  }

  return { topla, sayi, arayuzuGuncelle, hedefGuncelle, sakayik };
})();
