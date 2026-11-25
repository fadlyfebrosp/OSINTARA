# OSINTARA — Vercel + Supabase

**Discover Digital Footprints.** Starter website OSINTARA menggunakan Next.js, Vercel, dan Supabase.

## Stack
- Next.js 15 + TypeScript
- Vercel untuk deployment
- Supabase Auth untuk login/registrasi
- Supabase PostgreSQL untuk riwayat scan
- Supabase Row Level Security (RLS) untuk isolasi data tiap akun

## Modul yang sudah diimplementasikan
- Phone Intelligence: normalisasi dan pemeriksaan format dasar.
- IP Intelligence: metadata IP publik melalui ipwho.is.
- Email Intelligence: syntax, MX, SPF, dan DMARC.
- Domain Intelligence: DNS, HTTP HEAD metadata, dan TLS certificate.
- Username Checker: pemeriksaan URL profil publik di GitHub, GitLab, Reddit, Instagram, dan TikTok.
- Riwayat scan per pengguna.

## Modul yang belum diimplementasikan
Image Forensics dan APK Quick Scan belum dipindahkan ke versi ini. Keduanya memerlukan penanganan upload, batas ukuran, validasi file, dan pengolahan file di lingkungan serverless. Jangan menganggap modul tersebut sudah aktif hanya karena tercantum dalam skema database.

## 1. Siapkan Supabase
1. Buat project di https://supabase.com/.
2. Buka **Project Settings → API**.
3. Salin Project URL dan anon/public key.
4. Buka **SQL Editor**, lalu jalankan isi `supabase/schema.sql`.
5. Buka **Authentication → URL Configuration**.
6. Set Site URL ke URL deployment Vercel (atau `http://localhost:3000` saat development).
7. Tambahkan Redirect URL: `http://localhost:3000/auth/callback` dan `https://DOMAIN-VERCEL-KAMU/auth/callback`.

## 2. Jalankan secara lokal
Persyaratan: Node.js 20.9+ dan npm.

```bash
cp .env.example .env.local
# Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Buka http://localhost:3000.

Di Windows PowerShell, buat `.env.local` dengan menyalin `.env.example`, lalu isi nilainya.

## 3. Deploy ke Vercel
1. Upload project ke repository GitHub.
2. Masuk ke https://vercel.com/ dan import repository.
3. Tambahkan Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy.
5. Tambahkan domain Vercel pada Supabase Authentication Redirect URLs.

**Jangan pernah menaruh Supabase service_role key di browser, file `.env` yang di-commit, atau variabel `NEXT_PUBLIC_*`.** Project ini menggunakan anon key + RLS.

## 4. Catatan keamanan dan batasan
- Gunakan hanya data publik atau data yang pengguna berwenang untuk analisis.
- Geolokasi IP hanya perkiraan lokasi jaringan, bukan GPS/lokasi fisik.
- Username checker tidak membuktikan identitas atau kepemilikan akun.
- Pemeriksaan email tidak mengirim email dan tidak membuktikan mailbox aktif.
- Pemeriksaan domain adalah pengumpulan metadata publik, bukan vulnerability scanner.
- Phone Intelligence tidak memvalidasi nomor aktif, pemilik, operator, atau lokasi.
- Endpoint scan memerlukan sesi Supabase yang valid. Riwayat dibatasi dengan RLS.
- Terapkan CAPTCHA/rate limit sebelum membuka registrasi dan scan untuk publik.
- Jangan menambahkan modul pelacakan orang, spyware, eksploitasi, atau pengambilan data tanpa izin.

## Catatan deployment
Vercel Functions memiliki batas durasi dan resource sesuai paket. Pemindaian file besar atau analisis APK mendalam sebaiknya dipindahkan ke worker terisolasi dengan batas CPU/memori dan sandbox yang ketat.
