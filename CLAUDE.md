# CLAUDE.md — Workload Tracker

Bu dosya, proje boyunca Claude'un takip etmesi gereken tüm kuralları ve bağlamı içerir.
**Tüm maddeler zorunludur. Açık onay olmadan sapma yapılamaz.**

---

## Proje Özeti

**Amaç**: Ekip iş gücü dağılım analiz uygulaması — Vercel üzerinde çalışır.  
**Kullanıcılar** haftalık eforlarını üç kategori altında yüzdesel olarak girer (toplam = %100).  
**Yöneticiler** tüm ekibin verilerini dashboard üzerinden takip eder.

### Üç Efor Kategorisi
| Kategori | Açıklama |
|---|---|
| **Geçmişin İşleri** | Geçmiş problemlerin çözümü, ilgili toplantılar, araştırmalar |
| **Bugünün İşleri** | Backlog görevleri, projeler, aktif feature geliştirmeleri |
| **Yarının İşleri** | İnisiyatifler, kişisel gelişim, geleceğe yatırım aktiviteleri |

### Roller
| Rol | Yetkiler |
|---|---|
| **USER** | Kendi haftalık eforunu girer; kendi geçmiş verilerini görür |
| **ADMIN** | Tüm ekibin verilerini görür; dashboard, takım ve kullanıcı yönetimi |

### Kimlik Doğrulama
- Kullanıcılar **self-registration** ile hesap açar (e-posta + şifre)
- Login sonrası JWT tabanlı oturum (HttpOnly cookie)
- Admin rolünü yalnızca başka bir admin atayabilir
- İleride birden fazla admin olabilir

### Takım Yönetimi
- Takım isimlerini **yalnızca admin** belirler (ayrı bir tabloda tutulur)
- Kullanıcılar kayıt sırasında mevcut takımlardan birini seçer
- Admin takım ekleyebilir, düzenleyebilir, silebilir (soft-delete)

---

## Teknoloji Stack'i (Kesinleşmiş)

> Vercel deployment gerekliliği nedeniyle NFR §2 varsayılanından sapılmıştır.
> Tüm diğer NFR maddeleri geçerlidir.

| Katman | Karar | Gerekçe |
|---|---|---|
| Framework | **Next.js 15+ (App Router) + TypeScript** | Vercel-native, full-stack |
| ORM | **Prisma 5** | NFR §2'de kabul edilen alternatif |
| DB (dev) | **SQLite** | NFR §5.4 — dev/test için gömülü DB |
| DB (prod) | **PostgreSQL** (Neon/Vercel Postgres) | Enterprise RDBMS |
| Auth | **JWT + HttpOnly Cookie** (BFF pattern) | NFR §4.2 — XSS koruması |
| Validation | **Zod** | TypeScript-native, triple-layer uyumlu |
| Styling | **Tailwind CSS** | |
| Charts | **Recharts** | |
| Deploy | **Vercel** | Kullanıcı tercihi |

---

## Mimari Kurallar (NFR §3 — DEĞİŞTİRİLEMEZ)

### Katmanlı Mimari (NFR §3.1)
```
Route Handler  → Yalnızca HTTP routing. İş mantığı yok.
Service Layer  → Tüm iş mantığı. Transaction'lar burada.
Repository     → Yalnızca veri erişimi (Prisma).
Database       → Kalıcılık. Her tabloda audit kolonları.
```

### DTO Zorunluluğu (NFR §3.3)
- ORM/Prisma model nesneleri **asla** doğrudan API response'unda döndürülmez
- Tüm inbound: Zod şeması ile doğrulanan Request DTO
- Tüm outbound: `src/types/index.ts` içindeki Response DTO
- Her response DTO şu audit alanlarını içerir: `id`, `createdBy`, `lastUpdater`, `operationTime`, `isDeleted`
- Error response formatı: `{ message, details, timestamp }`

### Frontend Kuralları (NFR §3.4)
- Tüm HTTP çağrıları **yalnızca** `src/lib/api-client.ts` üzerinden yapılır
- UI bileşenlerinde `fetch()` doğrudan çağrılamaz
- Template/JSX içinde hesaplama veya veri dönüşümü yapılmaz
- Tüm hatalar `<ErrorAlert />` bileşeni ile gösterilir

---

## Güvenlik Kuralları (NFR §4 — KESİN İHLAL YOK)

### Kimlik Doğrulama (NFR §4.1)
- Access token süresi ≤ 1 saat
- Refresh token süresi ≤ 24 saat
- Logout'ta **her iki token da** geçersiz kılınır (DB'de revocation)
- Her korumalı endpoint her istekte token'ı doğrular

### Yetkilendirme (NFR §4.2)
- JWT **yalnızca HttpOnly cookie**'de tutulur — `localStorage`/`sessionStorage` yasak
- Her frontend route korumalıdır (login/register hariç)
- Admin endpoint'leri middleware'de rol kontrolünden geçer

### Triple-Layer Validation (NFR §4.3)
1. **Frontend**: Zod şeması ile form doğrulaması (API çağrısı öncesi)
2. **API**: Zod şeması ile DTO doğrulaması (iş mantığı öncesi)
3. **Veritabanı**: Prisma şema kısıtları (son güvenlik hattı)

### Hata Yönetimi (NFR §4.4)
- 400: Validation hatası (alan detayları ile)
- 401: Kimlik doğrulama hatası
- 403: Yetkilendirme hatası
- 404: Kaynak bulunamadı
- 500: Beklenmeyen hata (stack trace **asla** response'a eklenmez)

### Dev Credentials (NFR §4.5)
- `admin@workload.dev` / `Admin123!` → **yalnızca dev** (`prisma/seed.ts`)
- Production'a asla deploy edilemez

---

## Veritabanı Kuralları (NFR §5 — İSTİSNASIZ)

### Soft Delete (NFR §5.1) — FİZİKSEL DELETE YASAK
- Hiçbir kayıt fiziksel olarak silinmez
- Silme işlemi `isDeleted = "YES"` yapar
- Tüm sorgular `isDeleted: "NO"` filtresi içerir

### Audit Kolonları (NFR §5.2) — HER TABLODA ZORUNLU
```
CREATED_BY     VARCHAR  — kaydı oluşturan kullanıcının e-postası
LAST_UPDATER   VARCHAR  — son güncelleyen kullanıcının e-postası
OPERATION_TIME TIMESTAMP — son işlem zamanı (UTC)
LAST_OPERATION VARCHAR  — CREATE | UPDATE | DELETE
IS_DELETED     VARCHAR  — YES | NO
```
Audit alanları `src/lib/audit.ts` içindeki `createAudit()` / `updateAudit()` / `deleteAudit()` fonksiyonları ile doldurulur.

### Tarih/Saat (NFR §5.3)
- Tüm timestamp'ler **UTC** olarak saklanır ve iletilir
- Yerel saat dönüşümü yalnızca UI katmanında yapılır
- Hafta sınırları daima **Pazartesi 00:00:00 UTC** — `src/lib/week.ts` → `getWeekStart()` kullanılır

### Ortam Ayrımı (NFR §5.4)
- Dev: SQLite (`file:./dev.db`)
- Prod: PostgreSQL — credentials **asla** kaynak kodda veya config dosyasında olmaz

---

## API Tasarım Kuralları (NFR §6)

- Base path: `/api/v1/` (her zaman versiyonlu)
- Tüm list endpoint'leri **sayfalı** döner — sınırsız sonuç yasak
- 201: Başarılı oluşturma
- 200: Başarılı güncelleme
- CORS: Dev'de `localhost:3000`, Prod'da yalnızca kayıtlı domain — wildcard `*` yasak

---

## Kod Kalitesi (NFR §7)

- `console.log` / `print` üretim kodunda **yasak** — `src/lib/logger.ts` kullanılır
- Magic string/number yok — sabitler veya enum kullanılır
- Transaction'lar service katmanında açılır; controller veya repository'de asla
- Constructor injection tercih edilir (NFR §7.3)

---

## Dokümantasyon (NFR §9 — HER KOD DEĞİŞİKLİĞİNDE GÜNCELLENMELI)

| Değişiklik | Güncellenecek Dosya |
|---|---|
| Yeni entity/resource | `API-DOCUMENTATION.md` |
| API değişikliği | `API-DOCUMENTATION.md` |
| Config değişikliği | `CONFIGURATION-GUIDE.md` |
| Mimari değişiklik | `ARCHITECTURE.md` |
| Yeni geliştirici workflow | `DEVELOPMENT-GUIDE.md` |
| Her sürüm | `CHANGELOG.md` |

---

## Performans (NFR §10)

- Tüm foreign key ve sık filtrelenen kolonlar index'lenir
- List endpoint'leri baştan itibaren sayfalı
- N+1 query'den kaçınılır (eager loading)

---

## Deployment (NFR §11)

- Prod'da credentials yalnızca environment variable veya secrets manager'dan
- `/api/health` → liveness endpoint (auth gerektirmez)
- Debug endpoint'leri prod'da authentication olmadan açık bırakılamaz

---

## KESİNLİKLE YASAK (NFR §12)

| Eylem | Sebep |
|---|---|
| Fiziksel `DELETE` | Audit ve kurtarma gereksinimi |
| ORM model nesnesini doğrudan API response'unda döndürmek | Schema sızması |
| JWT'yi `localStorage`'da saklamak | XSS açığı |
| Credentials/secret'ı kaynak kodda hardcode etmek | Güvenlik ihlali |
| Herhangi bir katmanda input validation'ı atlamak | Injection/veri bozulması riski |
| `console.log` / `System.out.println` ile loglama | Prod'da kaybolur |
| `main` branch'e doğrudan commit | Branching stratejisi ihlali |
| Stack trace'i API error response'unda göstermek | İç detaylar ifşa olur |
| Sayfalama olmadan liste döndürmek | DoS riski |
| Kod değişikliğini dökümantasyon güncellemesi olmadan commit etmek | Dökümantasyon drift'i |

---

## Proje Dosya Yapısı

```
src/
  app/
    (app)/              — korumalı route'lar (auth kontrolü layout'ta)
      entry/            — haftalık efor girişi
      history/          — kişisel geçmiş
      dashboard/        — admin dashboard
      admin/
        teams/          — takım yönetimi
        users/          — kullanıcı yönetimi
    api/v1/             — API route handler'ları
      auth/             — register, login, logout, me
      teams/            — CRUD
      users/            — CRUD
      efforts/          — kaydet, geçmiş, dashboard, trends
    login/              — public login sayfası
    register/           — public kayıt sayfası
  components/
    ui/                 — Button, Input, Card, Badge
    shared/             — Navbar, ErrorAlert, LoadingSpinner
    effort/             — EffortSlider, EffortHistoryTable
    dashboard/          — TrendChart, MemberSummaryTable
    admin/              — TeamTable, UserTable
  lib/
    db.ts               — Prisma client singleton
    auth.ts             — JWT imzalama/doğrulama/cookie
    password.ts         — bcrypt
    logger.ts           — yapılandırılmış loglama
    audit.ts            — audit alanı yardımcıları
    week.ts             — UTC hafta sınırı yardımcıları
    api-client.ts       — merkezi frontend HTTP client
    api-response.ts     — standart response yardımcıları
    validations/        — Zod şemaları
  middleware.ts         — Edge middleware (JWT kontrolü)
  types/index.ts        — paylaşılan DTO'lar ve TypeScript tipleri
prisma/
  schema.prisma
  seed.ts               — DEV ONLY
```

---

*Bu dosya BA-NFR-System-Prompt.md (v2.0, Nisan 2026) ve proje gereksinimlerine dayanmaktadır.*
*Her önemli karar değişikliğinde güncellenmesi zorunludur.*
