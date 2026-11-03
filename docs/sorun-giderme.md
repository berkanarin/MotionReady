# Sorun giderme

| Belirti | Neden | Çözüm |
|---|---|---|
| `No Chrome, Edge or Chromium found` | Tarayıcı bilinen yollarda değil | `CHROME_PATH` ortam değişkenini ver |
| Film karesinde "node mr.mjs capture …" yazıyor | Proje henüz yakalanmamış | `node mr.mjs capture <ad>` |
| Bazı bölümler yakalamada boş ya da soluk | Sayfanın kendi animasyon kütüphanesi öğeleri gizli tutuyor | `capture.wait` değerini artır; inatçı katmanları `capture.hide` ile kaldır |
| Çerez bandı, sohbet balonu görünüyor | Sayfanın parçası olarak yakalandı | `"capture": { "hide": ["#cookie", ".chat-widget"] }` |
| Planda `LATE` var | Sahne kısa, bölüm kalabalık | O sahnenin `bars` değerini artır ya da daha az bölüm seç |
| Final sürüsü yanlış yerde toplanıyor | `cta` metni sayfada başka yerde de geçiyor | Butonun tam metnini yaz. Motor buton içindeki ve en alttaki eşleşmeyi seçer; plan raporunda `press "…"` satırına bak |
| `finale: no CTA` | CTA son sahnenin görünümünde değil | CTA'nın bulunduğu bölümü son sahne yap |
| Başlık nav'ın altında yarım | Sayfanın dibinde kamera için yer yok | Son sahneyi bir önceki bölümle değiştir ya da `capture.maxHeight` ile sayfayı kısalt |
| Metin bulanık | Yakalama ölçeği filmden düşük | `capture.dpr` değerini artır (landscape için 1.25 yeterli) |
| Logo yok, kapanışta harf var | Sabit nav'da görsel bulunamadı | Normal davranış; başlığın ilk harfi kullanılır |
| `EncodingError: The source image cannot be decoded` uyarıları | Çok uzun sayfa görüntüsü | Kareler etkilenmiyorsa zararsızdır. Gerekirse `capture.maxHeight` değerini düşür |
| Ses çok sessiz | Müzik kazancı düşük ya da efektler kapalı | `audio.musicGainDb`, `audio.sfx` |

← [Ses](ses.md) · [Yaklaşım karşılaştırması](karsilastirma.md) →
