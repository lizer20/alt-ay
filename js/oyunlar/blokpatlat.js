/* =========================================================
   BLOK PATLAT  (Block Blast tarzı)
   8x8 tahta. Aşağıdaki üç parçayı sürükleyip tahtaya bırak.
   Bir satır veya sütun tamamen dolunca patlar.
   Üç parçanın da sığacak yeri kalmayınca oyun biter.
   ========================================================= */

/* Dokunmatikte parmak hareketi kaç katı büyütülsün.
   1   = birebir (parmakla parça aynı yolu gider)
   1.7 = parmağını 10 cm oynatınca parça 17 cm gider — tahtanın üst
         sırasına ulaşmak için başparmağını ekran boyu sürüklemen gerekmez.
   Çok yükseltirsen hassas yerleştirme zorlaşır. Farede hep 1 kalır. */
const BLOK_SURUKLEME_KAZANCI = 1.7;

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

  /* Hız için iki önbellek:
     - boş ızgara her karede 64 kez çizilmesin diye hazır resim olarak tutulur
     - "bu parça bir yere sığıyor mu" sorusu tahtanın tamamını tarıyor,
       her karede değil sadece tahta/tepsi değişince hesaplanır */
  let izgaraTuval = null;
  let tepsiSigar = [false, false, false];
  let ekstraKare = 0;   // hareket bittikten sonra birkaç kare daha çiz

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
    /* Tepsi patlama sürerken yenilenebiliyor. Birazdan silinecek hücreleri
       geçici olarak boş sayıyoruz, yoksa tahtayı olduğundan dolu görüp
       gereksiz yere en küçük parçaları veriyoruz. */
    const gecici = [];
    if (patlama) {
      for (const [r, s] of patlama.hucreler) {
        gecici.push([r, s, tahta[r][s]]);
        tahta[r][s] = null;
      }
    }

    tepsi = Array.from({ length: TEPSI_ADET }, yeniParca);

    /* En az bir parça tahtaya sığsın.
       Tamamen rastgele üç parça bazen hiçbiri sığmayacak şekilde geliyor ve
       oyun, aslında oynanabilecek bir hamle varken bitiyordu. Hiçbiri
       sığmıyorsa rastgele bir yuvayı, sığanlar arasından seçilmiş bir
       parçayla değiştiriyoruz — rastgeleliği en az bozan yol. */
    if (!tepsi.some((p) => biryereSigarMi(p.sekil))) {
      const uyanlar = SEKILLER.filter((s) => biryereSigarMi(s));
      if (uyanlar.length) {
        tepsi[rastgele(TEPSI_ADET)] = {
          sekil: uyanlar[rastgele(uyanlar.length)].map((s) => s.slice()),
          foto: rastgele(FOTOLAR.length),
        };
      }
    }

    for (const [r, s, deger] of gecici) tahta[r][s] = deger;   // geri koy

    tepsiGiris = TEPSI_GIRIS_SURESI;
    tepsiSigmaGuncelle();
  }

  function tepsiSigmaGuncelle() {
    tepsiSigar = tepsi.map((p) => (p ? biryereSigarMi(p.sekil) : false));
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

    // ilk hamleden sonra ipucu balonuna gerek yok
    const ipucu = document.getElementById("blokIpucu");
    if (ipucu) ipucu.classList.add("gizle");

    dolulariPatlat();
    if (tepsi.every((p) => p === null)) tepsiyiDoldur();
    else tepsiSigmaGuncelle();     // tahta değişti, sığma durumu da değişmiş olabilir
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
    if (kombo > 1) komboBaloncugu(kombo);
  }

  /* Kombo sayısı kutuların üstünde bir an belirip kaybolur */
  function komboBaloncugu(sayi) {
    const b = document.getElementById("blokKombo");
    if (!b) return;
    b.textContent = "KOMBO ×" + sayi;
    b.classList.remove("gorun");
    void b.offsetWidth;          // animasyonu baştan başlat
    b.classList.add("gorun");
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
    const ortaY = Math.min(Math.max(hamY, hucre * 1.7 + 46), en - hucre * 0.5);

    Efektler.yaziEkle(ortaX, ortaY, "+" + kazanilan, "#d13f6b", Math.max(20, hucre * 0.62));
    // Kombo yazısı burada değil, kutuların üstündeki baloncukta gösteriliyor
    const ovgu = OVGULER.find((o) => cizgi >= o.esik);
    if (ovgu) {
      Efektler.yaziEkle(ortaX, ortaY - hucre * 1.05, ovgu.metin, "#7f5cbd", Math.max(18, hucre * 0.54));
    }

    Efektler.sars(Math.min(4 + cizgi * 3, 15), 0.3);
  }

  function patlamayiBitir() {
    for (const [r, s] of patlama.hucreler) tahta[r][s] = null;
    patlama = null;
    tepsiSigmaGuncelle();          // yer açıldı, sığmayan parçalar sığabilir
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

    /* Tahtanın çevresindeki pay, parçacıkların dışarı taşabilmesi için.
       Eskiden hücre boyutuyla orantılıydı (yarım hücre) ve hücrelerden
       ciddi yer çalıyordu — küçük telefonlarda bloklar gereksiz küçük
       kalıyordu. Artık sabit ve küçük. */
    pay = 8;

    const yatayKenar = darEkran ? 14 : 44;   // sayfa kenarı + çerçeve payı
    const kullanilabilirEn = Math.min(window.innerWidth - yatayKenar, 470);
    const tahtaUst = tuval.parentElement.getBoundingClientRect().top + window.scrollY;
    // ipucu balonu akışta yer kaplamıyor, hesaba katmaya gerek yok
    const kullanilabilirBoy = window.innerHeight - tahtaUst - (darEkran ? 18 : 44);

    // yatay: 8 hücre + iki yandan pay
    const hX = Math.floor((kullanilabilirEn - pay * 2) / IZGARA);
    // dikey: 8 hücre + ara boşluk (0.45) + tepsi (1.7) + iki uçtan pay
    const hY = Math.floor((kullanilabilirBoy - pay * 2) / (IZGARA + 2.15));
    hucre = Math.max(26, Math.min(hX, hY, 56));

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
    blokOnbellegiTemizle();   // hücre boyutu değişti, eski görseller geçersiz
    izgarayiHazirla();
    kutuyuTazele();
    ekstraKare = 3;
    ciz();
  }

  /* Boş ızgarayı bir kez çizip hazır resim olarak sakla */
  function izgarayiHazirla() {
    const en = IZGARA * hucre;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    izgaraTuval = document.createElement("canvas");
    izgaraTuval.width = Math.round(en * dpr);
    izgaraTuval.height = Math.round(en * dpr);
    const c = izgaraTuval.getContext("2d");
    c.scale(dpr, dpr);
    for (let r = 0; r < IZGARA; r++) {
      for (let s = 0; s < IZGARA; s++) {
        bosHucreCiz(c, s * hucre, r * hucre, hucre, izgaraRengi);
      }
    }
  }

  /* Bir tepsi yuvasının ölçüleri (tahta koordinatında) */
  function yuvaKutusu(slot) {
    const yuvaEni = (IZGARA * hucre) / TEPSI_ADET;
    return { x: slot * yuvaEni, y: tepsiUst, en: yuvaEni, boy: tepsiYuksekligi };
  }

  /* Sürüklenen parçanın sol üst köşesi (tahta koordinatında).

     Parmak hareketi "kazanç" ile büyütülüyor: parmağın tuttuğu noktadan
     itibaren gittiği yolun katı kadar parça yol alıyor. Böylece küçük bir
     başparmak hareketiyle tahtanın öbür ucuna ulaşılabiliyor. */
  function suruklenenKonum() {
    const s = suruklenen;
    const parca = tepsi[s.slot];
    const en = sekilEni(parca.sekil) * hucre;
    const boy = sekilBoyu(parca.sekil) * hucre;

    const etkinX = s.baslangicX + (s.x - s.baslangicX) * s.kazanc;
    const etkinY = s.baslangicY + (s.y - s.baslangicY) * s.kazanc;

    let x = etkinX - en / 2;
    let y = etkinY - (s.yukariKaydir ? boy + hucre * 0.35 : boy / 2);

    /* Büyütülmüş hareketle parça tahtadan uçup gitmesin diye sınırla.
       Pay yarım hücreden küçük: fazla ittirsen bile hedef hücre yuvarlanınca
       tahtanın içinde kalıyor, yani parça kenara yapışıyor — yerleştirilemez
       hale gelmiyor. Aşağıda tepsiye kadar inebilir ki parçayı geri
       bırakıp vazgeçebilesin. */
    const pay2 = hucre * 0.45;
    const tahtaEn = IZGARA * hucre;
    x = Math.min(Math.max(x, -pay2), tahtaEn - en + pay2);
    y = Math.min(Math.max(y, -pay2), tepsiUst + tepsiYuksekligi - boy);

    return { x, y, en, boy };
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

    // boş ızgara: tek hazır resim olarak (dolu hücreler üstünü kapatıyor)
    if (izgaraTuval) ctx.drawImage(izgaraTuval, 0, 0, en, en);

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

      // sığacak yeri kalmayan parçayı soluk göster (önbellekten)
      const alfa = tepsiSigar[i] ? 1 : 0.32;

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

    /* Gölge: shadowBlur telefonda çok pahalı olduğu için bulanıklık yerine
       hafif kaydırılmış koyu bir katman kullanıyoruz — aynı "havada duruyor"
       hissini veriyor, maliyeti neredeyse sıfır. */
    ctx.save();
    ctx.fillStyle = "rgba(120, 76, 92, 0.22)";
    for (const [r, s] of hucreler) {
      yuvarlakYol(
        ctx,
        s * hucre + hucre * 0.06,
        r * hucre + hucre * 0.16,
        hucre * 0.88, hucre * 0.88,
        hucre * 0.17
      );
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

    /* Ekranda hareket eden bir şey yoksa yeniden çizmiyoruz — tuval son
       kareyi zaten gösteriyor. Boşta pil yakmıyor, sürüklerken de tüm
       kare bütçesi harekete kalıyor. */
    const hareketVar = suruklenen || patlama || yerlesme || tepsiGiris > 0 || !Efektler.bosMu();
    if (hareketVar) ekstraKare = 3;
    if (hareketVar || ekstraKare > 0) {
      ciz();
      if (!hareketVar) ekstraKare--;
    }

    raf = requestAnimationFrame(dongu);
  }

  /* ------------------------- sürükleme ------------------------- */

  /* Tuvalin ekrandaki yeri sürükleme boyunca sabit — her parmak
     hareketinde getBoundingClientRect çağırmak tarayıcıyı boşuna
     yeniden yerleşim hesabına zorluyordu. */
  let tuvalKutusu = null;

  function kutuyuTazele() {
    tuvalKutusu = tuval ? tuval.getBoundingClientRect() : null;
  }

  function tuvalKonumu(e) {
    const k = tuvalKutusu || tuval.getBoundingClientRect();
    return { x: e.clientX - k.left - pay, y: e.clientY - k.top - pay };
  }

  function basildi(e) {
    if (bitti || patlama) return;
    Ses.uyandir();
    kutuyuTazele();
    const { x, y } = tuvalKonumu(e);
    if (y < tepsiUst) return;

    const yuvaEni = (IZGARA * hucre) / TEPSI_ADET;
    const slot = Math.floor(x / yuvaEni);
    if (slot < 0 || slot >= TEPSI_ADET || !tepsi[slot]) return;

    e.preventDefault();
    try { tuval.setPointerCapture(e.pointerId); } catch { /* önemsiz */ }

    const dokunmatik = e.pointerType === "touch";
    suruklenen = {
      slot,
      x, y,
      baslangicX: x, baslangicY: y,        // hareketin ölçüleceği sıfır noktası
      kazanc: dokunmatik ? BLOK_SURUKLEME_KAZANCI : 1,
      pointerId: e.pointerId,
      // dokunmatikte parça parmağın üstünde dursun ki görünsün
      yukariKaydir: dokunmatik,
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
    ekstraKare = 3;
    const ipucu = document.getElementById("blokIpucu");
    if (ipucu) ipucu.classList.remove("gizle");
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
      window.addEventListener("scroll", kutuyuTazele, { passive: true });

      document.getElementById("blokYeni").addEventListener("click", () => { Ses.tik(); yeniOyun(); });
      document.getElementById("blokKatmanDugme").addEventListener("click", () => { Ses.tik(); yeniOyun(); });
      window.addEventListener("resize", () => { if (aktif) boyutlandir(); });
    }

    const izgara = getComputedStyle(document.documentElement).getPropertyValue("--izgara").trim();
    if (izgara) izgaraRengi = izgara;

    aktif = true;
    yeniOyun();
    /* Sayfa ilk açıldığında ipucu yazısının kaç satır saracağı henüz belli
       olmuyor; düzen oturduktan sonra bir kez daha ölçüyoruz, yoksa küçük
       ekranlarda tahta birkaç piksel büyük kalıp sayfayı kaydırıyor. */
    requestAnimationFrame(() => { if (aktif) boyutlandir(); });
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
