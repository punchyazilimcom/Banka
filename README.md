# Garanti Transfer Takip Sistemi

> Masaüstü (.exe) + Mobil (Android/iOS) · Premium banka uygulaması kalitesinde arayüz
> **Geliştirici: PUNCH YAZILIM**

Garanti BBVA hesabına gelen **transfer / havale / EFT / FAST** bildirim
maillerini otomatik okuyan; **GELEN** ve **GİDEN** işlemleri ayıran; her işlemi
**kişi** ve **firma** bazında gruplayan; masaüstü ve mobilde gerçek zamanlı
senkron çalışan bir takip sistemi.

> ⚠️ **Gerçeklik notu:** Garanti'nin halka açık hesap API'si yoktur.
> "Otomatik çekme" = banka bildirim maillerini **IMAP** ile okuyup **regex** ile
> ayrıştırmaktır. Bu projede sahte bir "banka API" katmanı **yoktur**.

---

## Mimari (npm workspaces monorepo)

```
packages/
  shared/    → Paylaşılan TS: veri modeli, kişi/firma sınıflandırma, para & toplama
  core/      → React 18 + TypeScript + Vite UI (TEK kod tabanı, tüm cihazlar)
  worker/    → Node IMAP okuyucu (imapflow + mailparser) + Garanti parser + testler
  backend/   → Self-host Node + SQLite (Express + SSE)  ·  veya Firebase
apps/
  desktop/   → Electron sarmalayıcı → electron-builder ile .exe (NSIS)
  mobile/    → Capacitor ile aynı React kodundan Android / iOS
```

### Veri akışı

```
IMAP kutusu ─▶ worker (parse) ─▶ backend (Firestore / SQLite)
                                       │
                  cihazlar ◀── gerçek zamanlı (SSE / onSnapshot)
                                       │
                          yeni işlemde push / tray bildirimi
```

Backend `.env` içindeki `BACKEND_MODE` ile seçilir: **`sqlite`** (self-host) veya
**`firebase`**.

---

## Hızlı Başlangıç

Gereksinim: **Node 20+**.

```bash
# 1) Bağımlılıkları kur (tüm workspace'ler)
npm install

# 2) Ortam değişkenleri
cp .env.example .env        # düzenleyin

# 3) (Self-host) backend'i başlat + örnek veriyle doldur
npm run seed   --workspace=@gtt/backend   # örnek 80 işlem (opsiyonel, demo)
npm run backend                           # http://localhost:4000

# 4) Arayüzü dev modda aç
npm run dev                               # http://localhost:5173
```

> Backend kapalıyken UI otomatik olarak **örnek veriye** düşer (Ayarlar'dan
> kapatılabilir), böylece tasarımı anında görebilirsiniz.

---

## Worker — Mail Okuma & Ayrıştırma

```bash
# .env içinde IMAP_* ve BACKEND_MODE doldurulduktan sonra
npm run worker        # açılışta son N günü tarar + IMAP IDLE ile canlı dinler
npm run worker:dev    # değişiklikte yeniden başlat
```

- **IMAP IDLE** ile klasör dinlenir; yeni mail geldiğinde anında çekilir.
- Açılışta son `IMAP_LOOKBACK_DAYS` gün taranır — **idempotent** (mailId ile tekrarsız).
- Garanti bildirim gövdesinden regex ile çıkarılanlar: yön, tutar, para birimi,
  karşı taraf adı, IBAN, açıklama, kanal (EFT/FAST/Havale), tarih-saat, işlem
  sonrası bakiye.
- **Kişi/Firma sınıflandırma:** `LTD, ŞTİ, A.Ş, SAN, TİC, İNŞ, MALZ, GIDA…`
  ekleri veya 10 haneli VKN → **firma**; aksi halde **kişi**. Kullanıcı UI'dan
  düzeltebilir, düzeltme kalıcı kaydedilir (aynı isim sonra doğru atanır).

### Parser testleri

```bash
npm run test:parser    # örnek Garanti mail gövdeleriyle 32 test
```

---

## Masaüstü (.exe) Build

```bash
# Geliştirme (pencereyi aç)
npm run desktop:dev

# Windows kurulum (.exe / NSIS) üret  →  apps/desktop/release/
npm run desktop:build                        # mevcut platform hedefi
npm --workspace=@gtt/desktop run build:win   # açıkça Windows NSIS
```

> `.exe` üretimi **Windows** (veya Wine kurulu) ortamda yapılmalıdır.
> Çıktı: `apps/desktop/release/GarantiTransferTakip-Setup-<sürüm>.exe`.
> Uygulama tray'e küçülür ve yeni işlemde **tray bildirimi** gösterir.

---

## Mobil (Android / iOS) Build

```bash
# Web varlıklarını üret + Capacitor'a senkronla
npm run mobile:sync --workspace=@gtt/mobile     # (= build:core + copy:web + cap sync)

# Platform ekle (ilk seferde)
npm --workspace=@gtt/mobile run add:android
npm --workspace=@gtt/mobile run add:ios          # macOS + Xcode gerekir

# Android Studio / Xcode'da aç ve APK/IPA al
npm --workspace=@gtt/mobile run open:android
npm --workspace=@gtt/mobile run open:ios
```

> Android APK için **Android Studio + SDK**, iOS için **macOS + Xcode** gerekir.
> Biyometrik giriş ve push (FCM/APNs) native kabukta `@capacitor/push-notifications`
> ile etkinleştirilir; UI tarafı runtime'da `window.Capacitor` algılayıp kullanır.

---

## Backend Seçenekleri

### A) Self-host (SQLite) — `BACKEND_MODE=sqlite`
- `npm run backend` → Express API + **SSE** gerçek zamanlı akış.
- Veri `SQLITE_PATH` dosyasında. Endpoint'ler: `/api/transactions`,
  `/api/mail-ids`, `/api/overrides`, `/api/stream`.

### B) Firebase — `BACKEND_MODE=firebase`
- Worker, `firebase-admin` ile Firestore'a yazar (`npm i firebase-admin -w @gtt/worker`).
- UI, `firebase` Web SDK ile `onSnapshot` dinler (VITE_FIREBASE_* doldurulur).
- Güvenlik kuralları ve indeksler: `packages/backend/firebase/`.

---

## Tasarım Sistemi

Tüm renk/spacing/tipografi token'ları **tek dosyada**:
`packages/core/src/theme/tokens.ts`.

| | |
|---|---|
| Accent | `#FFD400` (sarı) |
| Zemin / Kart / Yüzey | `#0A0A0A` / `#141414` / `#1C1C1C` |
| Metin / İkincil | `#FFFFFF` / `#B5B5B5` |
| Gelen / Giden | `#2ECC71` / `#FF4D4D` |

Karanlık tema esas; glassmorphism kartlar, sarı glow, framer-motion geçişler,
animasyonlu sayaç, shimmer skeleton, mobilde pull-to-refresh, bakiye kartında
hareketli gradient. Başlık **Sora/Manrope**, gövde **Inter**, sayılar
tabular-nums. İkon **lucide-react**. Her ekranın altında **Punch Yazılım** imzası.

---

## Komut Özeti

| Komut | Açıklama |
|---|---|
| `npm run dev` | Core UI dev sunucu (5173) |
| `npm run build` | Core UI production build |
| `npm run backend` | Self-host SQLite backend (4000) |
| `npm run worker` | IMAP okuyucu servis |
| `npm run test:parser` | Parser birim testleri |
| `npm run typecheck` | Tüm paketlerde tip kontrolü |
| `npm run desktop:build` | Electron .exe (NSIS) |
| `npm run mobile:sync` | Capacitor senkron (build+copy+sync) |

---

## Güvenlik

- PIN düz metin saklanmaz: **salt + SHA-256 hash** (Web Crypto), mobilde biyometrik.
- IMAP şifresi **koda gömülmez**; worker `.env` üzerinden alır (`.env` git'e girmez).
- Backend yazma uçları `API_SHARED_SECRET` ile korunur.

---

© PUNCH YAZILIM · Garanti Transfer Takip Sistemi
