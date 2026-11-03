# Proje ayarları (`project.json`)

Her proje `projects/<ad>/project.json` dosyasıdır. Yalnızca `url` zorunludur; diğer her alanın makul bir varsayılanı var. Tipler: [`src/engine/types.ts`](../src/engine/types.ts).

## Alanlar

| Alan | Varsayılan | Açıklama |
|---|---|---|
| `url` | (zorunlu) | Kurulacak sayfa. `https://…` adresi ya da proje klasörüne göre bir dosya yolu (`site/index.html`). |
| `format` | `landscape` | `landscape` 1920×1080 (sayfa 1440 px genişlikte yakalanır), `square` 1080×1080 (1280 px), `portrait` 1080×1920 (430 px, mobil düzen). |
| `fps` | `60` | Kare hızı. |
| `bpm` | `120` | Kesmelerin oturduğu tempo. Müzik kullanıyorsan müziğin kendi BPM'ini yaz. |
| `hook` | `2` | Drop'tan önceki hook süresi (saniye). Tam vuruşa yuvarlanır. |
| `scenes` | `"auto"` | `"auto"` sayfanın bölümlerini yukarıdan aşağı seçer. Kendin seçmek için: `[{ "section": "<id>", "bars": 1.5 }, …]`. Bölüm kimlikleri `capture` çıktısında listelenir. |
| `maxScenes` | `6` | `auto` modunda en fazla sahne sayısı. Fazlası eşit aralıkla seyreltilir; CTA'nın bulunduğu bölüm her zaman kalır. |
| `barsPerScene` | `1.5` | `auto` modunda sahne uzunluğu (ölçü). İlk sahne en az 2 ölçüdür. |
| `cursors` | `44` | Sürüdeki cursor sayısı (8–80). Kapanışa 140 ek cursor katılır. |
| `tags` | genel liste | Cursor'ların çalışırken taşıdığı etiketler: ürünün araçları, özellikleri, ekip adları… |
| `palette` | 11 renk | Cursor renkleri. |
| `cta` | yok | Finalde sürünün toplanıp bastığı butonun görünen metni. Aynı metin birkaç yerde geçerse buton içindeki ve sayfada en alttaki seçilir. |
| `end` | yok | Kapanış kartı: `{ "title", "subtitle", "button", "url", "duration" }`. `duration` saniyedir (3.5–8, varsayılan 5); kısa filmlerde kısalt. Yoksa film kurulumdan sonra biter. |
| `background` | koyu gradyan | Pencerenin arkasındaki zemin (CSS `background`). |
| `address` | URL'nin alan adı | Tarayıcı çubuğunda görünen adres. |
| `capture.width` | formata göre | Yakalama genişliği (CSS px). |
| `capture.dpr` | formata göre | Yakalama piksel oranı. Film ölçeğinden küçük olursa metin bulanıklaşır. |
| `capture.maxHeight` | 11000 (dikeyde 6000) | Çok uzun sayfaları buradan keser. |
| `capture.wait` | `2500` | Sayfa açıldıktan sonra beklenen süre (ms). |
| `capture.hide` | `[]` | Yakalamadan önce kaldırılacak CSS seçicileri: çerez bandı, sohbet balonu, yükleme ekranı… |
| `audio.sfx` | `true` | Arayüz efektleri. |
| `audio.music` | yok | `projects/<ad>/audio/` içindeki müzik dosyası. Git'e girmez. |
| `audio.musicDrop` | `0` | Müzik dosyasında drop'un saniyesi; filmin drop anına oturtulur. |
| `audio.musicGainDb` | `-6` | Müziğin miksteki seviyesi. |

## Planı okumak

`node mr.mjs plan <ad>` şöyle bir rapor yazar:

```
  araclar   6.47s–11.18s  band 947–1773  camera 937→973   39 blocks, built by 10.58s  copies 5
```

- **band:** O sahnede kurulan sayfa aralığı (CSS px). Dışarıda kalanlar baştan bitmiş görünür, çünkü kamera onları kurulurken hiç göstermez.
- **camera:** Kameranın sahne başında ve sonunda durduğu kaydırma değeri. Başlık her zaman nav'ın en az 40 px altında kalır.
- **built by:** Son bloğun bittiği an. Sahne sonundan önce olmalı.
- **LATE n:** n blok sahne kapanırken hâlâ kuruluyor demektir. Çözüm: o sahneye daha çok `bars` ver ya da daha az bölüm seç.
- **copies:** ⌥-sürükleyerek kopyalanan tekrar eden kart sayısı.

## Sık ayarlar

- **Bir bölümü atla ya da sırayı değiştir:** `scenes` listesini kendin yaz.
- **Daha hızlı ya da yavaş film:** `bpm` ve `bars` birlikte belirler. 120 BPM'de 1 ölçü 2 saniyedir.
- **Kalabalık sayfa geç kalıyor:** O sahnenin `bars` değerini 0.5 artır.
- **Dikey (Reels/Shorts):** `"format": "portrait"` ve yeniden `capture`. Sayfa mobil düzende yakalanır.

← [Kurulum](kurulum.md) · [Mimari](mimari.md) →
