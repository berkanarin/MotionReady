# Kalite kontrol

Teslimden önce her film için, istisnasız. Bu kurallar tek tek revizyon turlarında öğrenildi.

## Komutlar

```bash
node mr.mjs plan <ad>                  # LATE satırı olmamalı
node mr.mjs sheet <ad> 30              # 30 karelik genel bakış → out/sheet.png
node mr.mjs stills <ad> 2.1s,6.6s      # şüpheli anlar, büyük boy
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration projects/<ad>/out/<ad>.mp4
```

Render'dan sonra her saniyeden ve her sahne geçişinden kare çıkarıp tek tek bak (geçişler: sahne başı + 0.4 sn, sahne sonu − 0.2 sn):

```bash
ffmpeg -i projects/<ad>/out/<ad>.mp4 -vf "fps=2,scale=480:-1" kareler/%03d.png
```

## Kare kontrol listesi

- [ ] **Pencere hiçbir karede kırpılmaz.** Tarayıcı penceresi her zaman bütün görünür.
- [ ] **Görevsiz cursor kümesi yok.** Drop'tan sonra hiçbir yerde çalışmadan duran ya da dönen bir grup olmamalı. Kısa çıkış anları dışında her cursor bir işin üzerinde ya da bir işe gidiyor olmalı. Sürü yalnızca hook'ta ve finalde toplanır.
- [ ] **Başlık nav'ın altında kalmaz.** Hiçbir kamera durağında bir başlık sabit nav'ın arkasında yarım görünmemeli. Kayış sırasında geçmesi normaldir.
- [ ] **Hook ilk karede okunur.** Boş sayfada yalnızca logo karosu ve sürü olmalı; taban görüntüde kalmış küçük öğe olmamalı.
- [ ] **Sürü CTA'da toplanır**, başka bir metin ya da footer linkinde değil.
- [ ] **Kopyalar doğru.** Yalnızca aynı görünen kartlar kopyalanır (koyu bir buton beyaz bir butonun kopyası olmaz).
- [ ] **Temizlik.** Sahne bittiğinde seçim kutusu, ölçü etiketi ve kılavuz izi kalmamalı.
- [ ] **Kapanış.** Cursor'lar logonun şeklini okunur biçimde çizmeli; keskin logo onların yerine tam oturmalı, başlık ve butonlar üst üste binmemeli.
- [ ] **Metin.** Türkçe karakterler doğru (İ/ı, Ş, Ğ). Kurgusal ürünlerde uydurma metrik ya da gerçekmiş gibi sunulan rakam yok.

## Ses kontrol listesi

- [ ] `audio` çıktısındaki ölçüm yaklaşık -14 LUFS ve true peak ≤ -1 dBTP.
- [ ] Müzik kullanılıyorsa drop filmin drop'unda; duyulur boşluk ya da kesinti yok. Müzik vurguların altında yalnızca ~3 dB alçalır.
- [ ] Dinlemediysen sesi dinlediğini söyleme; ölçümü ve cue sayısını raporla.

## Teslim

- Tam kalite `out/<ad>.mp4`, paylaşım kopyası `out/<ad>-share.mp4` (birkaç MB).
- Teslim notunda: dosya yolları, süre ve çözünürlük, ses ölçümü, kontrol edilen kare sayısı ve bilinen eksikler.

← [Mimari](mimari.md) · [Ses](ses.md) →
