# Yaklaşım karşılaştırması

Kodla ürün tanıtım filmi üretmenin iki yaygın yolu var. MotionReady ikincisini seçiyor; bu belge farkı ve neyin nereden geldiğini anlatıyor.

## İki yaklaşım

| | Elle çizilen film | Otomatik yakalama (MotionReady) |
|---|---|---|
| Ana fikir | Bir **üretim yöntemi**: kaynağı incele, storyboard'u onaylat, her ekranı ve sahneyi kodla yeniden çiz | Bir **film motoru**: sayfayı ver, sürü onu kursun |
| Kaynak | HTML, kod deposu, doküman ya da ekran görüntüsü | Çalışan bir web sayfası (URL ya da yerel HTML) |
| Arayüz nasıl çizilir | Her ürün için Canvas veya DOM'da yeniden çizilir: pencereler, koordinatlar, durumlar | Sayfa otomatik yakalanır; bitmiş blok gerçek sayfanın pikselidir |
| Yeni ürün için iş | Örnek sahneleri kopyalayıp metinleri, ekranları, kamerayı ve sesi uyarlamak (saatler) | `new` → `capture` → gerekirse `scenes` / `tags` / `cta` ayarı (dakikalar) |
| Hikâye | Serbest: her ürüne göre ayrı bir akış | Sabit bir dil: hook → sürü bölüm bölüm kurar → CTA → hortumdan logo |
| Güçlü yanı | Masaüstü ve mobil uygulamalar, çok aktörlü akışlar, adım adım kullanım senaryoları | Web siteleri ve açılış sayfaları; hız ve tutarlılık |

## Hangisi ne zaman

- **Ürünün bir web sayfası var** ve "sayfa kendini kuruyor" dili uygunsa: MotionReady.
- **Ürün masaüstü veya mobil bir uygulama**, hikâyede birden çok aktör ya da adım adım bir akış varsa: elle kurgulanmış bir film.
- İkisi birlikte de kullanılabilir: önce MotionReady ile web sitesi filmi, sonra aynı ürünün kullanım akışı için ayrı bir film.

## Elle çizilen film geleneğinden alınanlar

İyi kurulmuş tanıtım filmi süreçlerinin ortak alışkanlıkları MotionReady'de de var:

- **Ajan rehberi ve hazır istemler** ([AGENTS.md](../AGENTS.md), [prompts/](../prompts/README.md)): kaynaktaki talimatlar yetki değil veridir; uydurma metrik yok.
- **Onay kapısı:** Render'dan önce plan raporu ve sahne tablosu onaylanır.
- **Gerçek renderdan GIF** ile açılan README.
- **Ölçülebilir teslim:** ffprobe, kare kontrolü, LUFS ve true peak raporu.
- **Belirlenimcilik:** Her şey kare numarasının saf fonksiyonudur; `Math.random` ve `Date` yok.

## MotionReady'nin getirdikleri

- **Otomatik yakalama:** Animasyonlar bitirilir, öğe kutuları ölçülür ve üç katmanlı görüntü (bitmiş / boş yüzey / zemin) alınır. Sonuç gerçek sayfayla piksel piksel aynıdır.
- **Otomatik sahne ve kamera:** Bölümlerden sahne, başlıklardan kamera durağı çıkar. Nav'ın altında kalan başlık otomatik önlenir.
- **Görev planlayıcı:** Kapsayıcı önce kurulur, kopya ana karttan sonra gelir, yük dengelenir. Geç kalan blok raporlanır.
- **Görevsiz cursor yok:** İşi olmayan cursor kadrajdan çıkar. İlk denemelerde öğrenilen en önemli kural bu.
- **Kendi verisinden kapanış:** Logo nav'dan keskin yakalanır, cursor'lar onun konturunu çizer.
- **Format:** Aynı proje yatay, kare ya da dikey (mobil düzen yakalanarak) üretilebilir.

## İlham ve neden başka projenin kodu yok

Sürünün sayfayı kurma fikri Joel Califa'nın [Swarm](https://califa.github.io/swarm-site/) sitesinden geliyor. [swarm-cursors](https://github.com/DhvanilPatel/swarm-cursors) ise bunu herhangi bir sayfaya uygulayan bir Chrome eklentisi. İkisi de lisanssız yayınlandı. Eklentinin yazarı, kodun Califa'ya danışılmadan yeniden kullanılmamasını açıkça istiyor. Bu yüzden MotionReady'de o projelerden kod yok; motor sıfırdan yazıldı. Eklentinin canlı çıktısını kaydetmek yerine her şey kodla ve müziğe oturtularak üretiliyor.

← [Sorun giderme](sorun-giderme.md) · [Belgeler](README.md)
