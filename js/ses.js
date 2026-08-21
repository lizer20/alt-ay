/* =========================================================
   SES  —  Efektler WebAudio ile üretilir (ses dosyası gerekmez).
   Arka plan müziği için assets/muzik/muzik.mp3 dosyasını koyman yeterli.
   ========================================================= */

/* Hangi olayda hangi ses dosyasının çalacağı.
   Dosyayı değiştirmek istersen assets/ses/ içine yenisini aynı adla koy,
   ya da buradaki yolu değiştir. Dosya yoksa yerine tarayıcı içinde
   üretilen efekt çalar, oyun bozulmaz. */
const SES_DOSYALARI = {
  satir: "assets/ses/satir-silme.wav",   // Tetris'te satır silinince
  kazandin: "assets/ses/kazanma.wav",    // hafıza/yapboz tamamlanınca
};

const Ses = (() => {
  let ctx = null;
  const havuz = {};
  const bozuk = {};
  let efektAcik = Kayit.al("efekt", true);
  let muzikAcik = Kayit.al("muzik", false);
  let muzikElemani = null;
  let muzikVar = false;

  function kur() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  /* Tek bir nota çal: frekans, süre, dalga tipi, ses seviyesi, gecikme */
  function nota(hz, sure = 0.12, tip = "sine", seviye = 0.18, gecikme = 0) {
    if (!efektAcik) return;
    const c = kur();
    if (!c) return;
    const t = c.currentTime + gecikme;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = tip;
    osc.frequency.setValueAtTime(hz, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(seviye, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + sure + 0.02);
  }

  /* Kısa gürültü patlaması — düşme/çarpma hissi için */
  function gurultu(sure = 0.08, seviye = 0.12) {
    if (!efektAcik) return;
    const c = kur();
    if (!c) return;
    const uzunluk = Math.floor(c.sampleRate * sure);
    const buf = c.createBuffer(1, uzunluk, c.sampleRate);
    const veri = buf.getChannelData(0);
    for (let i = 0; i < uzunluk; i++) {
      veri[i] = (Math.random() * 2 - 1) * (1 - i / uzunluk);
    }
    const src = c.createBufferSource();
    const gain = c.createGain();
    const filtre = c.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.frequency.value = 1400;
    gain.gain.value = seviye;
    src.buffer = buf;
    src.connect(filtre).connect(gain).connect(c.destination);
    src.start();
  }

  /* Hazır ses dosyasını çal. Çalamazsa false döner, çağıran taraf
     üretilen efekte geri düşer. Üst üste çalabilmek için küçük bir havuz. */
  function dosyaCal(ad, seviye = 0.75) {
    if (!efektAcik || bozuk[ad] || !SES_DOSYALARI[ad]) return false;

    if (!havuz[ad]) {
      havuz[ad] = Array.from({ length: 3 }, () => {
        const a = new Audio(SES_DOSYALARI[ad]);
        a.preload = "auto";
        a.addEventListener("error", () => { bozuk[ad] = true; });
        return a;
      });
    }

    const parca = havuz[ad].find((a) => a.paused || a.ended) || havuz[ad][0];
    try {
      parca.currentTime = 0;
      parca.volume = seviye;
      const sonuc = parca.play();
      if (sonuc && sonuc.catch) sonuc.catch(() => {});
      return true;
    } catch {
      bozuk[ad] = true;
      return false;
    }
  }

  const api = {
    /* Tarayıcılar sesi ancak kullanıcı bir şeye dokunduktan sonra açıyor */
    uyandir() {
      const c = kur();
      if (c && c.state === "suspended") c.resume();
    },

    tik() { nota(520, 0.06, "triangle", 0.10); },
    dondur() { nota(680, 0.07, "square", 0.07); },
    kaydir() { nota(380, 0.05, "triangle", 0.06); },
    dus() { gurultu(0.09, 0.14); nota(160, 0.09, "sine", 0.10); },

    satir(adet) {
      if (dosyaCal("satir", 0.85)) {
        // dört satır birden gidince üstüne küçük bir zafer notası
        if (adet >= 4) nota(1319, 0.3, "sine", 0.12, 0.22);
        return;
      }
      const dizi = [523, 659, 784, 1047];
      for (let i = 0; i < Math.min(adet, 4); i++) {
        nota(dizi[i], 0.16, "triangle", 0.16, i * 0.07);
      }
      if (adet >= 4) nota(1319, 0.35, "sine", 0.14, 0.3);
    },

    seviye() {
      [523, 659, 784, 1047].forEach((h, i) => nota(h, 0.14, "sine", 0.13, i * 0.06));
    },

    eslesme() {
      nota(660, 0.1, "triangle", 0.14);
      nota(880, 0.14, "triangle", 0.12, 0.08);
    },

    hata() { nota(200, 0.16, "sawtooth", 0.07); },

    /* bahçeye şakayık eklenince çalan minik çan */
    cicek() {
      [784, 988, 1319, 1568].forEach((h, i) => nota(h, 0.3, "sine", 0.12, i * 0.09));
      nota(2093, 0.5, "triangle", 0.06, 0.36);
    },

    kazandin() {
      if (dosyaCal("kazandin", 0.8)) return;
      [523, 659, 784, 1047, 1319].forEach((h, i) =>
        nota(h, 0.22, "triangle", 0.15, i * 0.11)
      );
    },

    bitti() {
      [440, 392, 330, 262].forEach((h, i) => nota(h, 0.28, "sine", 0.14, i * 0.14));
    },

    /* ---------------- arka plan müziği ---------------- */

    muzikKur(elem) {
      muzikElemani = elem;
      elem.addEventListener("canplay", () => {
        muzikVar = true;
        api.arayuzuGuncelle();
        if (muzikAcik) elem.play().catch(() => {});
      });
      elem.addEventListener("error", () => {
        muzikVar = false;
        api.arayuzuGuncelle();
      });
    },

    muzikAcKapa() {
      muzikAcik = !muzikAcik;
      Kayit.yaz("muzik", muzikAcik);
      if (muzikElemani && muzikVar) {
        if (muzikAcik) muzikElemani.play().catch(() => {});
        else muzikElemani.pause();
      }
      api.arayuzuGuncelle();
      return muzikAcik;
    },

    efektAcKapa() {
      efektAcik = !efektAcik;
      Kayit.yaz("efekt", efektAcik);
      if (efektAcik) api.tik();
      api.arayuzuGuncelle();
      return efektAcik;
    },

    get muzikDurumu() { return muzikAcik; },
    get efektDurumu() { return efektAcik; },
    get muzikDosyasiVar() { return muzikVar; },

    arayuzuGuncelle() {
      const mb = document.getElementById("muzikDugmesi");
      const eb = document.getElementById("efektDugmesi");
      if (mb) {
        mb.textContent = muzikAcik && muzikVar ? "🎵" : "🎵̸";
        mb.classList.toggle("kapali", !(muzikAcik && muzikVar));
        mb.title = muzikVar
          ? (muzikAcik ? "Müziği kapat" : "Müziği aç")
          : "Müzik için assets/muzik/muzik.mp3 dosyasını ekle";
      }
      if (eb) {
        eb.textContent = efektAcik ? "🔊" : "🔇";
        eb.classList.toggle("kapali", !efektAcik);
        eb.title = efektAcik ? "Ses efektlerini kapat" : "Ses efektlerini aç";
      }
    },
  };

  return api;
})();
