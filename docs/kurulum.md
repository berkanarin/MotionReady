# Kurulum

## Gerekenler

| Araç | Neden |
|---|---|
| Node.js 22 veya üstü | CLI, Remotion ve yakalama scripti (yerleşik `WebSocket` ve `fetch` kullanılır) |
| ffmpeg ve ffprobe (PATH'te) | Ses miksi ve ölçümü, paylaşım kopyası, GIF, kontrol sayfaları |
| Chrome, Edge veya Chromium | Sayfa yakalama. Remotion render için kendi tarayıcısını ayrıca indirir |

Windows'ta ffmpeg için: `winget install Gyan.FFmpeg`. macOS'ta: `brew install ffmpeg`.

Tarayıcı bilinen bir yolda değilse yolunu `CHROME_PATH` ortam değişkeniyle ver:

```bash
CHROME_PATH="/opt/google/chrome/chrome" node mr.mjs capture demo
```

## İlk çalıştırma

```bash
npm install
node scripts/check.mjs
node mr.mjs all demo
```

`check.mjs` proje dosyalarını, belgelerdeki bağlantıları, ffmpeg'i ve tarayıcıyı denetler. İlk render'da Remotion kendi başsız tarayıcısını indirir; bu normaldir ve bir kez olur.

## Platform notları

- **Windows:** Komutlar PowerShell'de de Git Bash'te de çalışır. Yollarda Türkçe karakter sorun çıkarmaz.
- **Linux sunucu:** Ekran gerekmez. Yazı tipleri için sistemde `fonts-noto` benzeri bir paket kurulu olsun; yakalanan sayfa kendi web fontlarını zaten indirir.
- **Render süresi:** 1080p60, 25 sn'lik bir film orta seviye bir dizüstünde birkaç dakika sürer. Eşzamanlılık `remotion.config.ts` içinde `Config.setConcurrency(4)` ile ayarlanır.

← [Belgeler](README.md) · [Proje ayarları](proje-ayarlari.md) →
