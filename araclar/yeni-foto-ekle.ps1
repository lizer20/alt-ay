# =========================================================
#  Yeni fotoğraf ekleme aracı
#
#  1) Eklemek istediğin fotoğrafları  araclar\yeni-fotolar\  klasörüne at
#  2) Bu dosyaya sağ tıkla -> "PowerShell ile çalıştır"
#     (ya da PowerShell'de:  .\araclar\yeni-foto-ekle.ps1  )
#
#  Script fotoğrafları üç boyutta işleyip assets klasörlerine ekler ve
#  js\ayarlar.js içindeki fotoSayisi değerini otomatik günceller.
# =========================================================

Add-Type -AssemblyName System.Drawing

$root    = Split-Path -Parent $PSScriptRoot
$girdi   = Join-Path $PSScriptRoot "yeni-fotolar"
$tileDir = Join-Path $root "assets\tiles"
$sqDir   = Join-Path $root "assets\kare"
$phDir   = Join-Path $root "assets\foto"
$arsiv   = Join-Path $root "orijinal-fotograflar"

foreach ($d in @($girdi, $tileDir, $sqDir, $phDir, $arsiv)) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

$yeniler = Get-ChildItem $girdi -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|bmp|webp)$' } | Sort-Object Name
if ($yeniler.Count -eq 0) {
  Write-Host "araclar\yeni-fotolar klasoru bos. Once oraya fotograf koy." -ForegroundColor Yellow
  try { Read-Host "Kapatmak icin Enter" } catch { }
  exit
}

# Mevcut en buyuk numarayi bul
$mevcut = Get-ChildItem $tileDir -Filter "foto-*.jpg" -ErrorAction SilentlyContinue |
          ForEach-Object { [int]($_.BaseName -replace 'foto-', '') }
# [int] sart: Measure-Object double dondurur, "{0:d2}" double ile calismaz
$sayac = if ($mevcut) { [int]($mevcut | Measure-Object -Maximum).Maximum } else { 0 }

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function New-EncoderParams([int]$q) {
  $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$q)
  return $ep
}

function Fix-Orientation($img) {
  if ($img.PropertyIdList -contains 274) {
    $o = $img.GetPropertyItem(274).Value[0]
    switch ($o) {
      3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
      6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
      8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
    }
    $img.RemovePropertyItem(274)
  }
}

function Save-Square($img, $size, $path, $q) {
  $w = $img.Width; $h = $img.Height
  $side = [Math]::Min($w, $h)
  $sx = [int](($w - $side) * 0.5)
  $sy = [int](($h - $side) * 0.28)   # yuzler genelde ust tarafta olur
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img,
    (New-Object System.Drawing.Rectangle(0, 0, $size, $size)),
    (New-Object System.Drawing.Rectangle($sx, $sy, $side, $side)),
    [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $bmp.Save($path, $jpegCodec, (New-EncoderParams $q))
  $bmp.Dispose()
}

function Save-Scaled($img, $maxEdge, $path, $q) {
  $scale = [Math]::Min(1.0, $maxEdge / [Math]::Max($img.Width, $img.Height))
  $nw = [int]($img.Width * $scale); $nh = [int]($img.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $nw, $nh)
  $g.Dispose()
  $bmp.Save($path, $jpegCodec, (New-EncoderParams $q))
  $bmp.Dispose()
}

foreach ($f in $yeniler) {
  $sayac++
  $id = "foto-{0:d2}" -f $sayac
  try {
    $img = [System.Drawing.Image]::FromFile($f.FullName)
  } catch {
    Write-Host "ATLANDI (okunamadi): $($f.Name)" -ForegroundColor Red
    $sayac--
    continue
  }
  Fix-Orientation $img
  Save-Square $img 160  (Join-Path $tileDir "$id.jpg") 78
  Save-Square $img 560  (Join-Path $sqDir   "$id.jpg") 84
  Save-Scaled $img 1100 (Join-Path $phDir   "$id.jpg") 84
  $img.Dispose()
  Move-Item $f.FullName (Join-Path $arsiv $f.Name) -Force
  Write-Host "eklendi: $id  <-  $($f.Name)" -ForegroundColor Green
}

# ayarlar.js icindeki fotoSayisi degerini guncelle
$ayarYolu = Join-Path $root "js\ayarlar.js"
$metin = Get-Content $ayarYolu -Raw -Encoding UTF8
$metin = [regex]::Replace($metin, 'fotoSayisi:\s*\d+', "fotoSayisi: $sayac")
Set-Content $ayarYolu $metin -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "Tamam! Toplam fotograf sayisi: $sayac" -ForegroundColor Cyan
Write-Host "Sayfayi yenilemen yeterli." -ForegroundColor Cyan
try { Read-Host "Kapatmak icin Enter" } catch { }
