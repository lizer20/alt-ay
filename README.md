# Rüveyda & Emre — Oyun Salonu 💞

Fotoğraflarınızla oynanan üç mini oyunun bulunduğu küçük bir web sitesi.
Kurulum yok, derleme yok, internet gerekmez — `index.html` dosyasına çift tıklaman yeterli.

---

## Oyunlar

| Oyun | Ne yapıyor |
|------|------------|
| 💗 **Fotoğraf Tetris** | Klasik Tetris. Düşen her parça rastgele bir fotoğrafınızla gelir. Satır silme, seviye atlama, hayalet parça (nereye düşeceğini gösterir), rekor kaydı. |
| 🧠 **Hafıza Kartları** | Kartları çevir, aynı fotoğrafı bul. Kolay (6 çift) / Orta (8) / Zor (12). Süre ve hamle sayısı tutulur. |
| 🧩 **Yapboz** | Bir fotoğraf seç, parçalara ayrılsın. İki parçaya tıklayarak yerlerini değiştir. 3×3 / 4×4 / 5×5. |

### Kontroller

**Tetris (klavye)**

| Tuş | İşlev |
|-----|-------|
| ← → | sağa / sola hareket |
| ↑ | döndür |
| ↓ | hızlı indir |
| Boşluk | anında bırak |
| P | duraklat |
| Esc | menüye dön |

**Tetris (telefon / tablet)**

Ekranın altında dokunmatik tuşlar çıkar:

```
 ◀  ▶              ▼              ⤓  ⟳
 sol başparmak   yumuşak inme   sağ başparmak
```

Sol tarafta hareket, tam ortada aşağı, sağda anında bırak ve döndürme.
Ekran kısaysa tuş şeridi ekranın altına yapışır, hep parmağının altında kalır.
Diğer iki oyun zaten tamamen tıklamayla oynanıyor.

---

## Nasıl açılır

**En kolay yol:** `index.html` dosyasına çift tıkla. Hepsi bu.

---

## Sevgiline nasıl gönderirsin

Dosyayı göndermek yerine bir **link** göndermek en iyisi — telefonundan da açabilir.

### Yol 1: GitHub Pages (ücretsiz, kalıcı)

1. [github.com](https://github.com) üzerinden hesap aç (varsa geç).
2. Yeni bir repo oluştur (**New repository**), adını `oyun` gibi bir şey koy, **Public** seç.
3. Repo sayfasında **uploading an existing file** bağlantısına tıkla.
4. Bu klasördeki her şeyi sürükleyip bırak — **ama `orijinal-fotograflar`, `orijinal-sesler` ve `araclar` klasörlerini yükleme**, onlar sadece sende dursun (boşuna yer kaplar).
5. **Commit changes** de.
6. Repo'da **Settings → Pages** → *Branch* kısmında `main` ve `/ (root)` seç, **Save**.
7. Bir iki dakika sonra sayfanın üstünde linkin çıkar:
   `https://kullaniciadin.github.io/oyun/` — işte gönderilecek link bu.

### Yol 2: Netlify Drop (en hızlısı)

[app.netlify.com/drop](https://app.netlify.com/drop) adresine bu klasörü sürükleyip bırak,
saniyeler içinde bir link verir. (Linkin kalıcı olması için ücretsiz hesap açman gerekir.)

---

## Kendine göre değiştirme

### Başlık ve yazılar

`js/ayarlar.js` dosyasını Not Defteri ile aç:

```js
baslik: "Rüveyda & Emre",              // üstteki ve menüdeki büyük yazı
altYazi: "bizim küçük oyun salonumuz", // altındaki küçük yazı
heroDegisimSn: 4,                      // kalpteki fotoğraf kaç saniyede bir değişsin
fotoSayisi: 24,                        // kaç fotoğraf var (araç bunu otomatik günceller)
```

### Yeni fotoğraf ekleme

1. Eklemek istediğin fotoğrafları `araclar/yeni-fotolar/` klasörüne at.
2. `araclar/yeni-foto-ekle.ps1` dosyasına **sağ tıkla → PowerShell ile çalıştır**.
3. Bitti. Script fotoğrafları üç boyutta hazırlar, `ayarlar.js` içindeki sayıyı günceller,
   orijinalleri de `orijinal-fotograflar` klasörüne taşır. Sayfayı yenilemen yeterli.

> Windows "bu script çalıştırılamaz" derse PowerShell'i açıp şunu bir kez çalıştır:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Elle eklemek istersen: aynı isimli dosyayı `assets/tiles` (160×160),
`assets/kare` (560×560) ve `assets/foto` (uzun kenar 1100px) klasörlerinin üçüne de
`foto-20.jpg` gibi sıradaki numarayla koy, sonra `fotoSayisi` değerini artır.

### Ses

- **Arka plan müziği:** `assets/muzik/` klasörüne `muzik.mp3` adında bir şarkı koy.
  Dosya varsa üstteki 🎵 düğmesi çalışır, yoksa pasif görünür.
- **Efektler:** Klasöre koyduğun iki ses dosyası şu an şöyle bağlı:

  | Dosya | Ne zaman çalıyor |
  |-------|------------------|
  | `assets/ses/satir-silme.wav` | Tetris'te satır silinince |
  | `assets/ses/kazanma.wav` | Hafıza / yapboz tamamlanınca |

  Değiştirmek istersen ya aynı isimle yeni dosya koy, ya da `js/ses.js` dosyasının
  en üstündeki `SES_DOSYALARI` listesindeki yolları düzenle.
  Diğer sesler (tıklama, döndürme, düşme, eşleşme) tarayıcı içinde üretiliyor,
  dosyaya ihtiyaç duymuyor. Hepsini 🔊 düğmesiyle kapatabilirsin.

### Renkler

`css/stil.css` dosyasının en başındaki `:root` bloğunda tüm renkler tanımlı:

```css
--pembe: #ff6b9d;
--gul:   #ff9ebb;
--altin: #ffd479;
--mor:   #a06bff;
```

---

## Klasör yapısı

```
index.html                 → ana sayfa
css/stil.css               → tüm görünüm ve renkler
js/
  ayarlar.js               → başlık, fotoğraf listesi, küçük yardımcılar
  ses.js                   → ses efektleri ve müzik
  uygulama.js              → menü ve sayfa geçişleri
  oyunlar/
    tetris.js
    hafiza.js
    yapboz.js
assets/
  tiles/  → 160×160  (Tetris blokları)
  kare/   → 560×560  (hafıza kartları, yapboz)
  foto/   → 1100px   (büyük gösterim)
  ses/    → efekt sesleri
  muzik/  → arka plan müziği (muzik.mp3 buraya)
araclar/
  yeni-foto-ekle.ps1       → yeni fotoğraf ekleme aracı
  yeni-fotolar/            → eklenecek fotoğrafları buraya at
orijinal-fotograflar/      → dokunulmamış orijinaller (yedek)
orijinal-sesler/           → orijinal ses dosyaları (yedek)
```

---

## Ufak notlar

- **Rekorlar** tarayıcının hafızasında (localStorage) tutulur. Yani senin bilgisayarındaki
  rekorla onun telefonundaki rekor ayrıdır. Tarayıcı geçmişini temizlersen sıfırlanır.
- Site tamamen çevrimdışı çalışır; internete hiçbir şey göndermez.
- Adres çubuğuna `#tetris`, `#hafiza` veya `#yapboz` ekleyerek doğrudan o oyuna girebilirsin.
- `orijinal-fotograflar` ve `orijinal-sesler` klasörleri sadece yedek — siteye yüklemene gerek yok.
