# Everstep — Microsoft Store Yayınlama Kılavuzu

Bu proje MSIX üretmeye hazırdır. Aşağıdaki adımların Partner Center hesabına bağlı bölümleri uygulama sahibi tarafından tamamlanır.

## 1. Partner Center ve ürün adı

1. Partner Center geliştirici hesabına giriş yap.
2. **Apps and games > New product > MSIX or PWA app** yolunu aç.
3. Rezerve edilmiş ürün adının `Everstep` olduğunu doğrula.
4. Product identity bölümündeki kimliklerin aşağıdaki değerlerle eşleştiğini doğrula.

Ad rezervasyonu yayımlamadan önce yapılmalıdır. Rezervasyon süresi dolmadan bir gönderim oluştur.

## 2. Paket kimliğini projeye aktar

Partner Center'da ürün sayfasından **Product management > Product identity** bölümünü aç. Buradaki değerleri:

- Package/Identity/Name: `Zorbey.Everstep`
- Package/Identity/Publisher: `CN=7E9C97B3-EC5B-4A25-A7BF-3C59BAA59DF3`
- Publisher display name: `Zorbey`

`Package.appxmanifest` dosyasındaki karşılıklarıyla değiştir.

GitHub Actions kullanıyorsan bu değerleri repository secrets olarak ekle:

- `MSIX_IDENTITY_NAME`
- `MSIX_PUBLISHER`
- `MSIX_PUBLISHER_DISPLAY_NAME`

## 3. Windows üzerinde MSIX üret

Önerilen tek komutluk yöntem:

```powershell
.\BUILD_MSIX.ps1 `
  -IdentityName "Zorbey.Everstep" `
  -Publisher "CN=7E9C97B3-EC5B-4A25-A7BF-3C59BAA59DF3" `
  -PublisherDisplayName "Zorbey"
```

Betik bağımlılıkları kurar, testleri çalıştırır, uygulama/manifest sürümlerini eşitler ve MSIX'i üretir. Manuel yöntem:

```powershell
npm ci
npm run security:audit
npm test
npm run make:msix
```

Çıktı:

```text
out\make\msix\x64\*.msix
```

Store için yüklenen paketin kendi sertifikanla imzalanması gerekmez; Microsoft Store onaylanan MSIX paketini yayın aşamasında imzalar.

Paket logoları `extraResource` ile Electron uygulamasının `resources` klasörüne ayrıca kopyalanır. Manifestteki logo yolları bu nedenle `app\resources\...` biçimindedir; ASAR arşivinin içindeki görseller Store manifesti tarafından doğrudan kullanılamaz.

## 4. Paketi yerel olarak test et

Store'a göndermeden önce:

1. Temiz bir Windows 10 ve Windows 11 kullanıcı hesabında açılışı test et.
2. Sayaç arka plandayken, uygulama küçültülmüşken ve bilgisayar uykuya girip çıktığında süre davranışını kontrol et.
3. JSON yedekleme/içe aktarma ile CSV ve PDF dışa aktarmayı dene.
4. Türkçe, İngilizce, İspanyolca, Japonca, Almanca, İtalyanca ve Azerbaycanca dillerinde bildirimleri, sistem tepsisini, tarih/süre biçimlerini, raporları, temaları ve odak seslerini kontrol et.
5. Windows App Certification Kit çalıştır ve hataları gider.

## 5. Partner Center gönderimi

Yeni submission içinde en az şu bölümleri tamamla:

- Pricing and availability
- Properties ve kategori
- Age ratings
- Packages (`.msix`)
- Store listings (Türkçe, İngilizce, İspanyolca, Japonca, Almanca, İtalyanca ve Azerbaycanca)
- Submission options

Önerilen kategori: **Productivity**.

## 6. Hazır Store metinleri

`store/` klasöründe şunlar bulunur:

- Türkçe uzun/kısa açıklama
- İngilizce uzun/kısa açıklama
- İspanyolca uzun/kısa açıklama
- Özellik listesi
- Sürüm notu
- Anahtar kelime önerileri
- Sertifikasyon notu

## 7. Görseller

`store/screenshots/` klasöründe uygulama tasarımına göre hazırlanmış dört adet 1920×1080 taslak listeleme görseli; `assets/` klasöründe paket logoları bulunur. Windows derlemesinden sonra bu görselleri gerçek çalışan uygulamayla karşılaştır ve Store gönderiminde mümkünse gerçek ekran yakalamalarını kullan.

Store'da en az bir masaüstü ekran görüntüsü gerekir. Birden fazla görsel kullanmak; zamanlayıcı, görevler, istatistikler ve temaları ayrı ayrı göstermek daha iyi bir listeleme sağlar.

## 8. Gizlilik

Everstep:

- Hesap oluşturmaz.
- Kişisel veri toplamaz veya iletmez.
- Analitik/reklam SDK'sı içermez.
- Verileri yalnızca cihazda saklar.

`PRIVACY_POLICY_TR.md` metnini kendi alan adında veya erişilebilir bir GitHub Pages sayfasında yayımlayabilirsin. Partner Center'da uygulamanın kişisel bilgi erişimi/toplaması/iletmesi sorusunu gerçek uygulama davranışına göre yanıtla.

## 9. Güncellemeler

Yeni sürümde:

1. `package.json` sürümünü güncelle.
2. `Package.appxmanifest` sürümünü dört parçalı biçimde artır (`1.0.1.0`).
3. Git etiketi oluştur (`v1.0.1`).
4. GitHub Actions çıktısındaki yeni MSIX'i Partner Center'daki yeni submission'a yükle.

Paket Identity Name ve Publisher değerlerini sonraki güncellemelerde değiştirme; aksi hâlde Store bunu farklı bir uygulama olarak değerlendirebilir.

## 10. Partner Center'da tamamlanacak alanlar

Paket kimliği projeye uygulanmıştır. Partner Center'da yalnızca hesap üzerinden tamamlanabilen şu alanlar kalır:

- Store fiyatlandırması ve pazarlar
- Yaş derecelendirme anketi
- Gizlilik politikasının herkese açık URL'si
- Destek e-postası veya destek sayfası
- Store'a paket yükleme ve sertifikasyon gönderimi

Paket Identity Name ve Publisher değerlerini sonraki güncellemelerde değiştirme.
