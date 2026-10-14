# Rotanami 🌱

**Rotanami** adalah nama kerja untuk aplikasi web berbahasa Indonesia yang membantu pekebun rumahan,
kebun komunitas, dan petani skala kecil dalam:

- mengelola **kebun dan petak** (bedeng),
- mencatat **riwayat penanaman** per petak,
- merencanakan **rotasi tanaman** dengan saran berbasis aturan yang transparan,
- menyimpan hasil **uji tanah** dan melihat trennya,
- mencatat **observasi** (hama, penyakit, pertumbuhan, cuaca),
- melihat **kalender & pengingat** sederhana, serta
- **mengekspor data** ke CSV.

> Catatan merek: "Rotanami" adalah nama kerja yang dikarang untuk proyek ini. Kami tidak mengklaim
> nama ini unik secara global, bebas merek dagang, atau tersedia sebagai domain. Semua identitas
> visual dibuat orisinal dan tidak memakai aset merek lain.

**Open Source oleh MZF — 2026** — bebas dipakai, dipelajari, dan dikembangkan. Lihat bagian
[Lisensi](#lisensi) di akhir dokumen ini.

## Adaptasi teknologi pada lingkungan ini

Spesifikasi awal menyebut React + Vite + Express. Lingkungan eksekusi proyek ini menyediakan stack
full-stack **Next.js (App Router) + Node.js/TypeScript + PostgreSQL + Drizzle ORM**, sehingga:

- **Frontend**: React + TypeScript + Tailwind CSS + React Hook Form + Zod + Recharts + React Query
  (jalankan sebagai aplikasi Next.js; pengalaman pengembangannya setara SPA).
- **Backend**: API REST diimplementasikan sebagai *route handlers* Next.js (Node.js + TypeScript)
  dengan validasi Zod di setiap endpoint dan otorisasi per-kebun.
- **Database**: PostgreSQL. Kode memakai driver `pg` + Drizzle ORM dan membaca `DATABASE_URL` dari
  environment, sehingga **connection string Neon dapat langsung dipakai** (mis.
  `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`). Rahasia hanya dibaca sisi server.
- **Autentikasi**: sesi server-side dengan cookie **HttpOnly** (token disimpan sebagai hash di DB,
  bukan token mentah), kata sandi di-hash dengan scrypt + salt. Tidak ada token di `localStorage`.

## Fitur yang berfungsi

1. Registrasi, login, logout (sesi cookie HttpOnly). Tersedia **akun demo** berisi data contoh.
2. Multi-kebun per pengguna; kebun aktif dapat diganti; pemisahan data antar pengguna di API & DB.
3. Dashboard: salam, nama kebun aktif, ringkasan petak, rencana & tindakan, aktivitas berikutnya,
   aksi cepat, dan empty state onboarding.
4. CRUD kebun & petak dengan konfirmasi penghapusan (ketik nama untuk konfirmasi penting).
5. Katalog tanaman yang dapat dicari/difilter, dapat ditambah & diedit; data bawaan diberi label
   **"Data contoh"**. Keluarga botani dapat ditambah.
6. Riwayat penanaman per petak (status: direncanakan/ditanam/dipanen/dibatalkan), urut terbaru.
7. Perencana rotasi berbasis aturan (`src/lib/rotation.ts`, fungsi murni + teruji Vitest):
   membaca riwayat, mempertimbangkan keluarga botani/kelompok rotasi, catatan hama/penyakit,
   kategori hara & tanaman penutup tanah **hanya bila datanya tersedia**. Jika data kurang,
   aplikasi menampilkan "Data belum cukup…" dan menawarkan pilihan manual. Setiap saran menyertakan
   alasan, data yang dipakai, dan disclaimer bahwa ini panduan umum — bukan diagnosis agronomi.
8. Kalender/daftar agenda (rencana tanam, rencana rotasi, pengingat) + penandaan selesai pengingat.
   Pengingat bersifat **in-app**; tidak ada klaim email/push notification.
9. Catatan uji tanah per petak (hanya tanggal & petak yang wajib), riwayat + grafik tren sederhana.
   Aplikasi tidak mengarang nilai yang tidak dimasukkan pengguna dan tidak memberi diagnosis.
10. Ekspor **CSV** untuk riwayat tanam dan hasil uji tanah (PDF sengaja tidak disediakan agar tidak
    ada tombol yang tidak berfungsi).
11. Loading state, error state (pesan Indonesia ramah), empty state, dan toast sukses/gagal.
12. **Widget Trakteer** — tombol mengambang "Traktir kopi" di sudut kanan bawah. Saat diklik,
    muncul pilihan nominal traktiran (mulai Rp6.000 dan kelipatannya) beserta QR Code yang
    ditampilkan langsung di dalam aplikasi — pengguna tidak perlu pindah halaman.
13. **Unduh source code lengkap** — tersedia tombol di dalam widget Trakteer (dan dapat diakses
    langsung di `/rotanami-source-code.zip`) untuk mengunduh seluruh kode aplikasi dalam bentuk ZIP.

## Keterbatasan

- Saran rotasi bersifat heuristik sederhana dan transparan — bukan rekomendasi agronomi presisi.
- Pengingat hanya notifikasi di dalam aplikasi (belum email/push).
- Kolom `farm_members` tersedia di skema; undangan anggota lewat UI belum dibuat (peran pemilik
  sudah diterapkan pada otorisasi).
- Ekspor baru tersedia dalam CSV.

## Dukung proyek ini (Trakteer) ☕

Aplikasi ini **gratis dan bebas iklan** untuk siapa saja. Untuk menjaga server dan pengembangan
tetap berjalan, sediakan widget **Trakteer** di sudut kanan bawah layar.

- **Cara pakai**: klik tombol mengambang bertuliskan "Traktir kopi".
- Pilih nominal traktiran (Rp6.000, Rp12.000, Rp18.000, Rp24.000, Rp36.000, atau Rp60.000),
  lalu pindai QR Code yang muncul dengan kamera ponsel, atau
- klik tombol "Traktir via Trakteer" untuk membuka halaman
  <https://trakteer.id/perpus_opera/> langsung.

Pesan di widget: *"Web app ini gratis & bebas iklan. Kopi kecil, server tetap jalan."*

Widget ini muncul di semua halaman dan tidak melacak data pengguna apa pun.

## Mengunduh source code 📦

Seluruh kode aplikasi dapat diunduh langsung dari dalam aplikasi:

1. Klik widget **Traktir kopi** di sudut kanan bawah, lalu pilih **"Unduh source code lengkap"**; atau
2. Buka langsung path `/rotanami-source-code.zip` pada aplikasi yang sudah di-deploy.

File ZIP dibuat otomatis saat proses build melalui `npm run prebuild`
(script `scripts/pack-source.ts`). ZIP berisi seluruh berkas proyek (folder `src/`,
`scripts/`, konfigurasi, dokumentasi, dan migrasi SQL), **tanpa** `node_modules`, `.next`, `.git`,
`.env`, atau folder internal lainnya.

Untuk membuat ZIP secara manual:

```bash
npm run pack-source
```

## Prasyarat

- Node.js 20+
- PostgreSQL lokal **atau** database Neon

## Menjalankan secara lokal

```bash
# 1. Pasang dependensi
npm install

# 2. Siapkan environment
cp .env.example .env
# lalu isi DATABASE_URL sesuai database Anda

# 3. Terapkan skema database (Drizzle, tanpa file migrasi)
npx drizzle-kit push

# 4. Isi data contoh (katalog + akun demo)
npx tsx src/db/seed.ts

# 5. Jalankan aplikasi
npm run dev        # pengembangan: http://localhost:3000
# atau
npm run build && npm start   # produksi
```

### Membuat database Neon

1. Buat proyek di [Neon](https://neon.tech) dan salin *connection string*-nya.
2. Tempel ke `DATABASE_URL` di `.env` (contoh ada di `.env.example`).
3. Jalankan `npx drizzle-kit push` lalu `npx tsx src/db/seed.ts`.

Untuk PostgreSQL lokal: `createdb app_db` lalu gunakan
`postgresql://postgres:postgres@127.0.0.1:5432/app_db`.

## Environment variable

| Variabel       | Wajib | Keterangan                                        |
| -------------- | ----- | ------------------------------------------------- |
| `DATABASE_URL` | Ya    | Connection string PostgreSQL/Neon (hanya server). |

Tidak ada variabel `NEXT_PUBLIC_*` yang dibutuhkan; tidak ada rahasia yang dikirim ke browser.

## Akun & data demo

| Email                | Kata sandi    | Isi                                                        |
| -------------------- | ------------- | ---------------------------------------------------------- |
| `demo@rotanami.id`   | `rotanami123` | Kebun contoh dengan 3 petak, riwayat tanam, uji tanah, observasi, pengingat, dan 1 rencana rotasi. Semua ditandai "(Data contoh)". |

Anda juga bisa **mendaftar akun baru** untuk melihat alur kosong (empty state) dari nol.

## Struktur penting

```
src/
  db/schema.ts        # Skema Drizzle: users, sessions, farms, farm_members, plots,
                      # plant_families, crops, seasons, plantings, soil_tests,
                      # observations, rotation_plans, reminders
  db/seed.ts          # Seed katalog + data contoh berlabel
  lib/rotation.ts     # Mesin saran rotasi (fungsi murni)
  lib/rotation.test.ts# Pengujian Vitest untuk logika rotasi
  lib/schemas.ts      # Validasi Zod semua input API
  lib/auth.ts         # Sesi cookie HttpOnly (scrypt + hash token)
  app/api/...         # API REST + otorisasi per-kebun
  app/(app)/...       # Halaman aplikasi (dashboard, petak, katalog, perencana, kalender, pengaturan)
  app/login, register # Autentikasi
```

## Pengujian

```bash
npx vitest run    # unit test logika rotasi (8 kasus)
```

## Ringkasan API

Semua endpoint memvalidasi input dengan Zod dan memeriksa akses pengguna ke kebun terkait.

| Metode & path                       | Fungsi                                   |
| ----------------------------------- | ---------------------------------------- |
| `POST /api/auth/register`           | Daftar akun baru (langsung masuk)        |
| `POST /api/auth/login` / `logout`   | Masuk / keluar                           |
| `GET /api/me`                       | Pengguna + kebun aktif                   |
| `GET/POST /api/farms`               | Daftar / buat kebun                      |
| `PATCH/DELETE /api/farms/:id`       | Ubah / hapus kebun (pemilik)             |
| `POST /api/farms/:id/activate`      | Tetapkan kebun aktif                     |
| `GET/POST /api/plots`               | Daftar (ringkas) / buat petak            |
| `GET/PATCH/DELETE /api/plots/:id`   | Detail lengkap / ubah / hapus petak      |
| `GET/POST /api/crops`               | Katalog (cari+filter) / tambah tanaman   |
| `PATCH/DELETE /api/crops/:id`       | Ubah / hapus tanaman                     |
| `GET/POST /api/crop-families`       | Keluarga botani                          |
| `GET/POST /api/plantings`           | Riwayat tanam                            |
| `PATCH/DELETE /api/plantings/:id`   | Ubah / hapus riwayat                     |
| `GET/POST /api/soil-tests`          | Uji tanah                                |
| `PATCH/DELETE /api/soil-tests/:id`  | Ubah / hapus uji tanah                   |
| `GET/POST /api/observations`        | Observasi                                |
| `PATCH/DELETE /api/observations/:id`| Ubah / hapus observasi                   |
| `POST /api/rotation/suggest`        | Saran rotasi berbasis aturan             |
| `GET/POST /api/rotation-plans`      | Rencana rotasi                           |
| `PATCH/DELETE /api/rotation-plans/:id` | Ubah status / hapus rencana           |
| `GET/POST /api/reminders`           | Pengingat                                |
| `PATCH/DELETE /api/reminders/:id`   | Ubah / selesaikan / hapus pengingat      |
| `GET/POST /api/seasons`             | Musim tanam                              |
| `GET /api/dashboard`                | Ringkasan dashboard                      |
| `GET /api/calendar?farmId=&month=`  | Agenda per bulan                         |
| `GET /api/export/plantings`         | Ekspor CSV riwayat tanam                 |
| `GET /api/export/soil-tests`        | Ekspor CSV hasil uji tanah               |
| `GET /rotanami-source-code.zip`     | Unduh source code lengkap (ZIP)          |

## Lisensi

Hak cipta © 2026 **MZF**.

Proyek ini bersifat **open source** dan bebas digunakan, dipelajari, dimodifikasi, dan
didistribusikan ulang untuk kepentingan apa pun — termasuk penggunaan komersial — tanpa biaya,
tanpa iklan, dan tanpa syarat atribusi wajib.

Diberikan "sebagaimana adanya" tanpa jaminan dalam bentuk apa pun. Penulis tidak bertanggung jawab
atas kerugian yang timbul dari penggunaan aplikasi ini. Saran agronomi yang dihasilkan aplikasi
bersifat panduan umum, bukan diagnosis atau rekomendasi presisi.

**Open Source oleh MZF — 2026** 🌱
