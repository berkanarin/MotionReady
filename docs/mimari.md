# Mimari

```
mr.mjs ──► scripts/capture.mjs ──► projects/<ad>/capture/{page,bare,ground,logo}.png + blocks.json
       ──► scripts/report.ts   ──► plan raporu          (src/engine/timing.ts + plan.ts)
       ──► scripts/audio.ts    ──► out/soundtrack.wav   (aynı plan → ses anları)
       ──► scripts/render.mjs  ──► out/<ad>.mp4, -share.mp4, .gif   (Remotion: src/Root.tsx → src/film/*)
```

## 1. Yakalama: üç görüntü, bir düzen

Sayfa başsız tarayıcıda DevTools protokolüyle açılır (Playwright veya Puppeteer gerekmez). Bir kez baştan sona kaydırılır, böylece tembel yüklenen görseller ve kaydırınca beliren içerik tetiklenir. Ardından bütün sonlu animasyonlar `animation.finish()` ile bitirilir, hâlâ görünmez kalan içerik görünür yapılır. Aynı düzenden üç tam sayfa görüntüsü alınır:

| Dosya | İçinde | Film onu ne için kullanır |
|---|---|---|
| `page.png` | Bitmiş sayfa | Metin ve görseller buradan kesilir |
| `bare.png` | Bütün yazı ve görseller gizli | Bir kart önce boş yüzeyiyle belirir |
| `ground.png` | Kart yüzeyleri de gizli, yalnızca bölüm zeminleri | Filmin başladığı boş sayfa |
| `logo.png` | Nav'daki ilk görsel, 480 px | Hook karosu ve kapanış |

`blocks.json` her bloğun kutusunu sayfa CSS pikseli olarak tutar: **frame** (kendi zemini, kenarlığı ya da gölgesi olan yüzey), **media** (img/svg/video/canvas) ve **text** (kendi metin düğümü olan öğe; yazı boyutu ve satır sayısıyla). Yanında bölümler ve sabit nav da var.

Bitmiş bir blok, `page.png`'nin tam o kutusu olduğu için gerçek sayfayla piksel piksel aynıdır.

## 2. Zamanlama (`timing.ts`)

- **Izgara:** `DROP` hook'un sonudur (tam vuruş). `bar(k) = DROP + k × ölçü`.
- **Sahneler:** Bölümler sırayla sahne olur. Her sahnenin bir **bandı** (o sırada kurulan sayfa aralığı) ve bir **kamera durağı** vardır. Durak, bölüm başlığını nav'ın altında açıkta bırakır. Sayfanın dibinde kamera daha aşağı inemiyorsa ve bir önceki başlık nav'ın altında yarım kalıyorsa, kamera geri çekilir.
- **Kamera:** Sahneler arasında hızlı bir kayış (dikey hareket bulanıklığıyla), sahne içinde en fazla 36 px'lik yavaş bir süzülme.
- **Final:** CTA son sahnenin görünümündeyse sürü toplanır, yarım ölçü sonra basar. Ardından kapanış kartı gelir.

## 3. Plan (`plan.ts`)

1. **Bloklar** sahnelere dağıtılır. Sabit nav'ın içindekiler ilk sahneye ve ekran koordinatına bağlanır.
2. **Tekrar eden kartlar:** Aynı boyutta, aynı zemin tonunda ve aynı satır ya da sütunda olan kartların ilki ana kart olur, diğerleri ondan kopyalanır. Kopyanın içindeki kartlar kopyayla birlikte iner.
3. **Süreler:** Kart sürüklemesi boyuna göre (12–30 kare). Metin karakter sayısına göre. 30 px ve üstü başlıklar 22 px'te yazılır, sonra 8 adımda büyür. Görselde önce sürükleme, sonra tarama.
4. **Atama:** Her blok, başlayabileceği en erken ve en yakın, en az yüklü cursor'a verilir. Kapsayıcı kart bitmeden içi başlamaz, ana kart bitmeden kopyası başlamaz. Büyük başlık ve büyük kartlara iki yardımcı cursor kenardan eşlik eder.
5. **Hareket:** Her cursor'ın her kare için bir hedefi vardır: görev yolu, yaklaşma noktası (orada hafifçe kıpırdar) ya da işi yoksa pencerenin dışı. Sönümlü bir yay bu hedefi izler. Boştaki cursor'lar birbirini hafifçe iter. Gidiş yönüne en fazla 9° eğilirler. Simülasyon proje başına bir kez yapılır ve önbelleğe alınır.

## 4. Render (`src/film/`)

| Bileşen | Görev |
|---|---|
| `Chrome.tsx` | Tarayıcı penceresi (hiç kırpılmaz, hafif 3B süzülme), kaydırılan sayfa, kılavuz çizgileri, cetvel |
| `Page.tsx` | Bant bant sayfa: bitmiş bantlar `page.png`, canlı bant bloklar. Sahne bitince bant bitmiş görüntüye devredilir (seçim izleri kalmaz) |
| `Swarm.tsx` | Cursor'lar ve çalışırken taşıdıkları etiketler. Pencere dışına çıkan cursor söner |
| `Hook.tsx` | Boş sayfada logo karosu; drop'ta nav'daki yerine uçar |
| `EndCard.tsx` | Hortum → logonun piksellerinden örneklenen noktalara uçuş → keskin logo → başlık ve butonlar |

**Koordinatlar:** Sayfa CSS pikseli (bloklar) → `K` ölçeği ve kaydırma → film pikseli (cursor'lar). Nav blokları kaydırmayı yok sayar. Dönüşüm `plan.toScreen()` içindedir.

**Belirlenimcilik:** `Math.random`, `Date` ve `performance` kullanılmaz; rastgelelik `rand(seed)` ile gelir. Aynı proje her render'da aynı filmi verir.

← [Proje ayarları](proje-ayarlari.md) · [Kalite kontrol](kalite-kontrol.md) →
