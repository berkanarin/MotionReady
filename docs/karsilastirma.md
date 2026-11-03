# Videohmm ile karşılaştırma

[Videohmm](https://github.com/h1a1k1/Videohmm), kodla ürün tanıtım filmi üretmek için hazırlanmış bir rehber reposu. MotionReady'yi yazmadan önce incelendi. İki repo aynı problemin farklı uçlarına bakıyor.

## Özet

| | Videohmm | MotionReady |
|---|---|---|
| Ana fikir | Ajan için bir **üretim yöntemi**: kaynağı incele, storyboard'u onaylat, sahneleri elle kodla | Bir **film motoru**: sayfayı ver, sürü onu kursun |
| Kaynak | HTML, kod deposu, doküman veya ekran görüntüsü | Çalışan bir web sayfası (URL veya yerel HTML) |
| Arayüz nasıl çizilir | Her ürün için Canvas 2D'de **elle yeniden** çizilir (pencere dosyaları, koordinatlar, durumlar) | Sayfa **otomatik yakalanır**; bitmiş blok gerçek sayfanın pikselidir |
| Yeni ürün için iş | Örneği kopyalayıp metinleri, ekranları, kamerayı ve sesi uyarlamak (saatler) | `new` → `capture` → gerekirse `scenes`/`tags`/`cta` ayarı (dakikalar) |
| Hikâye | Serbest: her ürüne göre storyboard | Sabit bir dil: hook → sürü bölüm bölüm kurar → CTA → hortumdan logo |
| Motor | [ft-motion](https://github.com/imserhatdemir/ft-motion) (Canvas 2D, Puppeteer, alt kare hareket bulanıklığı, MIT) | Remotion (React) + DevTools protokolüyle kendi yakalayıcısı |
| Ses | Python ile sentezlenen müzik ve efekt (`ftsynth`) | Node ile sentezlenen efektler + isteğe bağlı kendi müziğin, iki geçişli loudnorm |
| Doğrulama | `validate_repo.py`: bağlantılar, kod eşleşmesi, sözdizimi | `check.mjs`: proje dosyaları, bağlantılar, ffmpeg, tarayıcı + `plan` raporu (geç kalan bloklar) |
| Belgeler | Çok geniş: biçim, storyboard, tasarım sistemi, ses tasarımı, kaynak türüne göre istemler, iki dil | Odaklı: kurulum, ayarlar, mimari, kalite kontrol, ses, sorun giderme, ajan rehberi |

## Videohmm'den alınanlar

- **Ajan rehberi ve hazır istemler** ([AGENTS.md](../AGENTS.md), [prompts/](../prompts/README.md)). Kaynak içindeki talimatlar yetki değil veridir; uydurma metrik yok; onay kapısı var.
- **Onay kapısı:** Render'dan önce plan raporu ve sahne tablosu onaylanır.
- **Gerçek renderdan GIF** ile açılan README ve "GIF sessizdir" notu.
- **Ölçülebilir teslim:** ffprobe, kare kontrolü, LUFS ve true peak raporu.
- **Belirlenimcilik:** Saf zaman fonksiyonu, `Math.random` ve `Date` yok.

## MotionReady'nin ekledikleri

- **Otomatik yakalama:** Bütün sayfa elle çizilmez. Animasyonlar bitirilir, öğe kutuları ölçülür ve üç katmanlı görüntü (bitmiş / boş yüzey / zemin) alınır. Sonuç gerçek sayfayla piksel piksel aynıdır.
- **Otomatik sahne ve kamera:** Bölümlerden sahne, başlıklardan kamera durağı çıkar. Nav'ın altında kalan başlık otomatik önlenir.
- **Görev planlayıcı:** Kapsayıcı önce kurulur, kopya ana karttan sonra gelir, yük dengelenir. Geç kalan blok raporlanır.
- **Görevsiz cursor yok:** İşi olmayan cursor kadrajdan çıkar. Bu, ilk denemelerde öğrenilen en önemli kural.
- **Kendi verisinden kapanış:** Logo nav'dan keskin yakalanır, cursor'lar onun konturunu çizer.
- **Format:** Aynı proje yatay, kare ya da dikey (mobil düzen yakalanarak) üretilebilir.

## Neden swarm-cursors kodu yok

Sürünün sayfayı kurma fikri Joel Califa'nın [Swarm](https://califa.github.io/swarm-site/) sitesinden geliyor. [swarm-cursors](https://github.com/DhvanilPatel/swarm-cursors) ise bunu herhangi bir sayfaya uygulayan bir Chrome eklentisi. İkisi de lisanssız yayınlandı ve eklentinin yazarı, kodun Califa'ya danışılmadan yeniden kullanılmamasını açıkça istiyor. Bu yüzden MotionReady'de o projelerden kod yok; motor sıfırdan yazıldı. Ayrıca eklentinin canlı çıktısını kaydetmek yerine her şey kodla ve müziğe oturtularak üretiliyor.

## Hangisi ne zaman

- **Ürünün bir web sayfası var** ve "sayfa kendini kuruyor" dili uygunsa: MotionReady.
- **Ürün masaüstü veya mobil bir uygulama**, hikâyede birden çok aktör ya da adım adım bir akış varsa: Videohmm'in yöntemi veya elle kurgulanmış bir film.
- İkisi birlikte de kullanılabilir: önce MotionReady ile web sitesi filmi, sonra aynı ürünün akışı için ayrı bir film.

← [Sorun giderme](sorun-giderme.md) · [Belgeler](README.md)
