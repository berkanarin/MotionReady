<div align="center">

# MotionReady

**Bir web sayfası ver, onu ekranda kuran bir lansman filmi al.**

Sayfa yakalanır, silinir ve araç etiketli onlarca cursor tarafından parça parça yeniden kurulur. Kodla, kare kare, her render aynı sonucu verir.

[Hızlı başlangıç](#hızlı-başlangıç) · [Proje ayarları](docs/proje-ayarlari.md) · [Nasıl çalışır](docs/mimari.md) · [Kalite kontrol](docs/kalite-kontrol.md) · [Ajan rehberi](AGENTS.md) · [Videohmm ile karşılaştırma](docs/karsilastirma.md)

![Pusula demo sayfasının cursor sürüsüyle kurulması](media/demo-build.gif)

</div>

*Yukarıdaki GIF, repodaki kurgusal demo sayfasının (`projects/demo`) gerçek renderından alınmıştır. Tam film 1920 × 1080, 60 fps, sesli ve 25 saniyedir; GIF sessizdir.*

## Ne yapar

| Adım | Ne olur |
|---|---|
| **Yakala** | Sayfa başsız Chrome'da açılır. Kaydırınca beliren animasyonlar bitirilir. Aynı düzenin üç tam sayfa görüntüsü (bitmiş sayfa, boş yüzeyler, yalnızca bölüm zeminleri) ve her öğenin kutusu alınır. Nav'daki logo ayrıca keskin çekilir. |
| **Planla** | Bölümler sahnelere, öğeler cursor görevlerine dönüşür. Kamera her bölümde başlık nav'ın altında kalmayacak şekilde durur, aralarda hızla kayar. Kesmeler müziğin temposuna oturur. |
| **Kur** | Her kart artı imleciyle çizilip `W × H` etiketiyle açılır. Metin imleçle yazılır, başlık küçük yazılıp köşe tutamacından adım adım büyütülür. Görsel yer tutucudan yukarıdan aşağı akar. Tekrar eden kartlar ilkinden ⌥-sürükleyerek kopyalanır ve kırmızı aralık ölçüsü gösterilir. İşi olmayan cursor pencerede beklemez; kenardan çıkar, işi gelince geri girer. |
| **Bitir** | Sürü CTA butonunda toplanır ve basar. Ardından ortada bir hortum gibi dönüp ürünün logosunu çizer; keskin logo onların yerine oturur. |
| **Ses** | Arayüz efektleri kurulumun kendi anlarına göre sentezlenir. İstersen kendi müziğini ekleyebilirsin (drop filmin drop'una oturur). Miks -14 LUFS'a, tepe -1.5 dBTP'ye ayarlanır. |

![Kapanış: sürü hortum olup logoyu çiziyor](media/finale.gif)

Gerçek bir ürün sayfasıyla örnek (`projects/slideready`, canlı [slideready.net](https://slideready.net)):

![SlideReady sitesinin kurulması](media/slideready.gif)

## Hızlı başlangıç

Gerekenler: **Node.js 22+**, **ffmpeg** (PATH'te) ve **Chrome, Edge veya Chromium**. Başka bir yerdeyse `CHROME_PATH` ile göster.

```bash
git clone https://github.com/berkanarin/MotionReady.git
cd MotionReady
npm install
node scripts/check.mjs
```

Örnek demoyu baştan sona üret (yakala → planla → ses → film → GIF):

```bash
node mr.mjs all demo
```

Çıktılar `projects/demo/out/` içine yazılır: `demo.mp4` (tam kalite), `demo-share.mp4` (küçük paylaşım kopyası), `demo.gif`, `soundtrack.wav`, `cues.json`.

## Kendi sayfan için

```bash
node mr.mjs new urunum https://urunum.com
node mr.mjs capture urunum
```

`capture`, planı da yazdırır: hangi bölüm hangi sahne, kamera nerede duruyor, her sahne ne zaman bitiyor, geç kalan blok var mı. Sonra `projects/urunum/project.json` dosyasında ince ayar yap:

```json
{
  "name": "urunum",
  "url": "https://urunum.com",
  "format": "landscape",
  "bpm": 120,
  "scenes": [
    { "section": "hero", "bars": 2 },
    { "section": "ozellikler", "bars": 1.5 },
    { "section": "fiyatlar", "bars": 1.5 }
  ],
  "tags": ["Pano", "Rapor", "Takvim"],
  "cta": "Ücretsiz başla",
  "end": { "title": "Ürünüm", "subtitle": "Kısa vaat cümlesi.", "button": "Hemen başla", "url": "urunum.com" },
  "capture": { "hide": [".cookie-banner"] },
  "audio": { "music": "parcam.mp3", "musicDrop": 12.4 }
}
```

Bütün alanlar ve varsayılanları: [proje ayarları](docs/proje-ayarlari.md).

```bash
node mr.mjs plan urunum              # plan raporu
node mr.mjs stills urunum 2s,6.5s    # tek tek kareler
node mr.mjs sheet urunum 20          # 20 karelik kontrol sayfası
node mr.mjs audio urunum             # ses
node mr.mjs render urunum            # film
node mr.mjs gif urunum 0 8 800 12    # 0–8 sn arası, 800 px, 12 fps GIF
node mr.mjs studio                   # Remotion Studio (props: {"project":"urunum"})
```

## Repo düzeni

| Yol | İçerik |
|---|---|
| [`mr.mjs`](mr.mjs) | Tek giriş noktası (CLI) |
| [`scripts/`](scripts) | Yakalama (`capture.mjs`), render ve GIF (`render.mjs`), ses (`audio.ts`), plan raporu (`report.ts`), repo kontrolü (`check.mjs`) |
| [`src/engine/`](src/engine) | Saf fonksiyonlar: zamanlama ve kamera (`timing.ts`), görev planı ve cursor hareketi (`plan.ts`), kapanış ritmi (`endTiming.ts`) |
| [`src/film/`](src/film) | Remotion bileşenleri: tarayıcı penceresi ve tasarım katmanı, sayfa blokları, sürü, hook, kapanış |
| [`projects/`](projects) | Her proje bir klasör: `project.json` (+ `capture/`, `audio/`, `out/`; bunlar git'e girmez) |
| [`docs/`](docs/README.md) | Kurulum, ayarlar, mimari, kalite kontrol, ses, sorun giderme, karşılaştırma |
| [`prompts/`](prompts/README.md) | Kodlama ajanına verilecek hazır istemler |
| [`media/`](media) | README GIF'leri ve kontrol sayfası (gerçek renderlar) |

## Kodlama ajanıyla

Claude Code veya başka bir ajana bu repoyu ver ve [`AGENTS.md`](AGENTS.md)'yi okut. Rehber şu akışı tarif eder: sayfayı yakala, planı ve sahne tablosunu onaya sun, render al, karelerle doğrula, teslim et. Hazır istemler [`prompts/`](prompts/README.md) içinde.

## Lisanslar ve teşekkür

- Render için [Remotion](https://www.remotion.dev) kullanılır. Remotion bireyler ve küçük ekipler için ücretsizdir; daha büyük şirketlerde [Remotion şirket lisansı](https://www.remotion.dev/license) gerekir.
- Sürünün sayfayı kurma fikri, Joel Califa'nın [Swarm](https://califa.github.io/swarm-site/) sitesinden ve onun izinden giden [swarm-cursors](https://github.com/DhvanilPatel/swarm-cursors) eklentisinden ilham alır. Bu repoda o projelerin kodu **yoktur**; motor sıfırdan yazılmıştır. Nedenini [karşılaştırma](docs/karsilastirma.md) belgesi anlatır.
- `projects/demo` sayfasındaki ürün, isimler ve metinler kurgusaldır.
- Kendi müzik ve ses dosyaların `projects/<ad>/audio/` altında kalır ve git'e girmez; her dosyanın lisansı kendine aittir.
