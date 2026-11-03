# Ses

`node mr.mjs audio <ad>` iki parçayı karıştırır ve `projects/<ad>/out/soundtrack.wav` ile `cues.json`'ı yazar. `render` bu dosya varsa onu filme gömer.

## 1. Arayüz efektleri (sentez, dosya gerekmez)

Efektler, planın kendi anlarından üretilir. Böylece ses görüntüyle kare kare eşleşir.

| Olay | Ses |
|---|---|
| Hook'ta sürü | Pentatonik, yumuşak blip'ler |
| Drop | Alçak vuruş ve kısa bir hava sesi |
| Kart yüzeyi iner | Kısa pop (aralıklı, en fazla 7 karede bir) |
| Metin yazılır | Hafif klavye tıkı (en fazla 5 karede bir) |
| Başlık büyür | Her adımda perdesi yükselen tık (8 adım) |
| Kopya bırakılır | Alçak "land" ve pop |
| Görsel taranır | Çok hafif süpürme |
| Kamera kayışı | Whoosh |
| CTA'ya basılır | Fare tıkı ve küçük bir zil |
| Kapanış | Yükselen hortum sesi, logoya konarken pop'lar, logo vuruşu (akor), kilitte parıltı |

Efektleri kapatmak için: `"audio": { "sfx": false }`.

## 2. Kendi müziğin (isteğe bağlı)

1. Dosyayı `projects/<ad>/audio/` altına koy (bu klasör git'e girmez).
2. `project.json`:

```json
"bpm": 102,
"audio": { "music": "parcam.mp3", "musicDrop": 10.81, "musicGainDb": -6 }
```

- `bpm`, müziğin kendi temposu olmalı; kesmeler ona oturur.
- `musicDrop`, müzik dosyasında drop'un saniyesidir. Filmin drop'una (hook sonu) hizalanır.
- Müzik vurguların (iniş, drop, tıklama, kapanış) altında yaklaşık 3 dB alçalır ve hiçbir yerde kesilmez. Sonda 1.2 sn içinde kısılarak biter.

Lisans: müziğin kullanım hakkı sana aittir. Telifli bir parçayı yalnızca kişisel kullanımda tut.

## 3. Mastering ve ölçüm

Önce yumuşak bir limiter geçişleri tıraşlar. Ardından iki geçişli `loudnorm` ölçüp tek bir lineer kazanç uygular (hedef -14 LUFS, tepe -1.5 dBTP). Son olarak `ebur128` sonucu ölçüp yazdırır:

```
soundtrack → projects/demo/out/soundtrack.wav
  152 cues, -14.6 LUFS, true peak -1.4 dBTP
```

Tepe sınırı izin vermediğinde ses hedefin 0.5 dB kadar altında kalabilir; bu kabul edilebilir.

← [Kalite kontrol](kalite-kontrol.md) · [Sorun giderme](sorun-giderme.md) →
