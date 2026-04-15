# Workload Tracker

Ekip iş gücü dağılım analiz uygulaması. Ekip üyeleri haftalık efor dağılımlarını **Geçmişin İşleri**, **Bugünün İşleri** ve **Yarının İşleri** kategorilerinde yüzdesel olarak girebilir; yöneticiler tüm ekibin analizini dashboard üzerinden takip edebilir.

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Full-stack Framework | Next.js 15 (App Router) + TypeScript |
| ORM | Prisma 5 |
| DB (dev) | SQLite |
| DB (prod) | PostgreSQL (Neon / Vercel Postgres) |
| Auth | JWT — HttpOnly Cookie (BFF pattern) |
| Validation | Zod (triple-layer: frontend + API + DB) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Deploy | Vercel |

## Hızlı Başlangıç (Dev)

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env.local
# .env.local içindeki JWT_SECRET'ı güçlü bir değerle değiştir

# 3. Veritabanını oluştur ve seed et
npm run db:push
npm run db:seed

# 4. Geliştirme sunucusunu başlat
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışır.

**Dev kullanıcıları** (seed ile oluşturulur — yalnızca dev ortamı):
- Admin: `admin@workload.dev` / `Admin123!`
- User: `ali.veli@workload.dev` / `User123!`

## Kullanıcı Rolleri

| Rol | Yetkiler |
|---|---|
| **USER** | Kendi haftalık eforunu girer, geçmiş verilerini görür |
| **ADMIN** | Tüm ekibin verilerini görür, dashboard'a erişir, takım ve kullanıcı yönetimi yapar |

## Sayfalar

| URL | Erişim | Açıklama |
|---|---|---|
| `/login` | Herkese açık | Giriş sayfası |
| `/register` | Herkese açık | Kayıt sayfası |
| `/entry` | USER + ADMIN | Haftalık efor girişi |
| `/history` | USER + ADMIN | Kişisel efor geçmişi |
| `/dashboard` | ADMIN | Ekip dashboard'u |
| `/admin/teams` | ADMIN | Takım yönetimi |
| `/admin/users` | ADMIN | Kullanıcı yönetimi |

## Efor Kategorileri

- **Geçmişin İşleri**: Geçmiş problemlerin çözümü, toplantı katılımı, eski işler için araştırma
- **Bugünün İşleri**: Backlog görevleri, projeler, mevcut feature geliştirmeleri
- **Yarının İşleri**: İnisiyatifler, kişisel gelişim, geleceğe yatırım aktiviteleri

> Üç kategori toplamı her zaman **%100** olmalıdır.

## Vercel Deploy

1. GitHub reposunu Vercel'e bağla
2. Environment variables ekle (`.env.example` referans):
   - `DATABASE_URL` — PostgreSQL connection string
   - `JWT_SECRET` — en az 32 karakter, güçlü rastgele string
3. Build command: `npm run build` (otomatik `prisma generate` içerir)
4. İlk deploy sonrası prod DB'yi migrate et: `npx prisma migrate deploy`

## Scriptler

```bash
npm run dev          # Geliştirme sunucusu
npm run build        # Prod build
npm run lint         # ESLint
npm run typecheck    # TypeScript tip kontrolü
npm run db:migrate   # Prisma migration (dev)
npm run db:seed      # Seed verisi yükle (dev only)
npm run db:studio    # Prisma Studio (DB görsel arayüz)
```
