# Android'den Her Yerden Erişim (Firebase) — Adım Adım

Bu rehber, telefonundan **internetin her yerinden** (aynı Wi-Fi şartı olmadan)
verilerine erişmen için Firebase kurulumunu ve **APK** üretimini anlatır.
Mimari: worker mailleri okur → **Firestore**'a yazar → Android uygulaman
`onSnapshot` ile gerçek zamanlı dinler → yeni işlemde **FCM push** gelir.

> Kendi sunucunu açıp sürekli çalıştırmana gerek yok; telefon doğrudan Google
> bulutuna (Firestore) bağlanır. Worker'ı evdeki/iş yerindeki bir bilgisayarda
> ya da küçük bir VPS'te çalıştırman yeterli (sadece mail okuyup yazar).

---

## 1) Firebase projesi oluştur

1. https://console.firebase.google.com → **Proje ekle** (örn. `garanti-takip`).
2. **Build → Firestore Database → Veritabanı oluştur** (production modunda başlat).
3. **Build → Authentication → Başla → Sign-in method → E-posta/Şifre**'yi **etkinleştir**.
4. **Authentication → Users → Kullanıcı ekle** → kendine bir e-posta + şifre tanımla
   (uygulamaya bununla gireceksin). Genel kayıt kapalı kalsın → sadece sen erişirsin.

## 2) Web yapılandırmasını al (UI için)

1. **Proje ayarları (⚙️) → Genel → Uygulamalarınız → Web (`</>`)** ekle.
2. Çıkan `firebaseConfig` değerlerini kök **`.env`** dosyana yaz:

```ini
BACKEND_MODE=firebase
VITE_BACKEND_MODE=firebase

VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=garanti-takip.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=garanti-takip
VITE_FIREBASE_STORAGE_BUCKET=garanti-takip.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
```

## 3) Servis hesabı (worker için)

1. **Proje ayarları → Hizmet hesapları → Yeni özel anahtar oluştur** → JSON indir.
2. Dosyayı `serviceAccount.json` olarak repo köküne koy (git'e **girmez**).
3. `.env`:

```ini
FIREBASE_SERVICE_ACCOUNT=./serviceAccount.json
FIREBASE_PROJECT_ID=garanti-takip
IMAP_HOST=imap.gmail.com
IMAP_USER=eposta@gmail.com
IMAP_PASSWORD=uygulama-sifresi
```

4. Worker'a admin SDK'sını kur ve çalıştır:

```bash
npm i firebase-admin -w @gtt/worker
npm run worker        # mailleri Firestore'a yazmaya başlar
```

## 4) Güvenlik kurallarını ve indeksleri yayınla

```bash
npm i -g firebase-tools
firebase login
cd packages/backend/firebase
firebase use garanti-takip
firebase deploy --only firestore:rules,firestore:indexes
```

Kurallar: yalnızca giriş yapmış kullanıcı okur; yazma sadece worker (admin).

---

## 5) Android uygulamasını (APK) hazırla

### 5a. Firebase'e Android uygulaması ekle
1. **Proje ayarları → Uygulamalarınız → Android** ekle.
2. **Paket adı:** `com.punchyazilim.garantitakip` (capacitor.config.ts ile birebir aynı).
3. **`google-services.json`** dosyasını indir (bir sonraki adımda yerleştireceğiz).

### 5b. Android platformunu oluştur
```bash
# Firebase env'i gömerek web'i derle + Capacitor'a kopyala + senkronla
npm run mobile:sync --workspace=@gtt/mobile
npm --workspace=@gtt/mobile run add:android
```

### 5c. google-services.json'u yerleştir
```bash
cp ~/İndirilenler/google-services.json apps/mobile/android/app/google-services.json
```
> Push (FCM) için bu dosya zorunlu. Capacitor `@capacitor/push-notifications`
> eklentisi zaten bağımlılıkta; `cap sync` Gradle'a ekler.

### 5d. APK üret
```bash
npm --workspace=@gtt/mobile run open:android   # Android Studio açılır
# Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s)
# Çıktı: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```
APK'yı telefona kopyalayıp kur (Bilinmeyen kaynaklara izin ver). İmzalı/release
APK için Android Studio → Generate Signed Bundle / APK.

---

## 6) Kullanım

1. Uygulamayı aç → **Firebase e-posta/şifrenle** giriş yap (oturum kalıcı, bir kez).
2. Ardından **PIN** belirle (cihaz kilidi).
3. Worker çalışırken yeni mail geldikçe işlemler **anında** düşer ve **push** gelir.

> Telefon artık her ağdan (mobil veri dahil) çalışır; yalnızca worker'ın bir yerde
> açık olması yeterli.

---

## Push (FCM) nasıl çalışır?

- Uygulama açılışta cihaz FCM token'ını Firestore `devices` koleksiyonuna yazar
  (`packages/core/src/lib/push.ts`).
- Worker yeni işlem yazınca tüm kayıtlı cihazlara bildirim gönderir
  (`packages/worker/src/backendClient.ts` → `sendPush`).
- Arka planda bile bildirim alırsın; uygulama açıkken ayrıca uygulama-içi toast görünür.

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| Girişte "izin yok" / boş liste | Auth kullanıcısı oluşturuldu mu? Kurallar deploy edildi mi? |
| İşlem gelmiyor | Worker çalışıyor mu? `serviceAccount.json` doğru mu? IMAP bilgileri? |
| Push gelmiyor | `google-services.json` `android/app/` içinde mi? Bildirim izni verildi mi? |
| APK ağa çıkamıyor | Firestore kuralları/Auth doğru; telefonda internet var mı? |
