# Dokumentasi Sistem Proxy & Perbaikan Frontend (Kolektaku)

Dokumen ini mencatat semua perubahan teknis yang dilakukan pada bagian Frontend (Next.js) untuk mengatasi masalah streaming video dan bypass Cloudflare.

## 1. Arsitektur Proxy (Bypass Cloudflare) - PREMIUM VERSION

### Status: Menggunakan Proxy Premium Webshare

Sistem ini menggunakan daftar proxy premium yang kamu berikan untuk mendapatkan performa yang jauh lebih stabil dan melewati blokir Cloudflare dengan lebih efektif.

### Fitur Utama:

- **Premium Sticky Proxy (Priority 1)**: Menggunakan algoritma hashing untuk memilih 1 proxy premium tetap dari daftar Webshare untuk setiap folder stream. Ini memastikan konsistensi IP yang sangat tinggi.
- **M3U8 Content Rewriting**: Playlist `.m3u8` otomatis ditulis ulang isinya agar semua link segmen video (`.ts`) dipaksa melewati endpoint proxy kita. Ini krusial agar video tidak berhenti di detik ke-8.
- **Free Mega Race Fallback (Priority 2)**: Jika proxy premium gagal atau diblokir, sistem otomatis beralih ke mode "Mega Race" menggunakan 15+ proxy gratisan secara paralel sebagai cadangan.
- **Smart Cloudflare Detection**: Sistem secara otomatis mendeteksi jika respon yang diterima adalah halaman challenge Cloudflare (HTML) dan langsung mencoba proxy lain.
- **Browser Spoofing & Caching**: Menggunakan header Chrome terbaru dan sistem caching 1 jam di Vercel Edge untuk performa maksimal.

---

## 2. Perbaikan Deployment & Frontend

### Suspense Boundaries (Fix Prerender Error)

Next.js melempar error saat build/prerendering jika ada komponen yang menggunakan `useSearchParams()` tanpa dibungkus `<Suspense>`.

- **Navbar**: Dibungkus Suspense di [layout.js](src/app/layout.js) dan [Navbar.jsx](src/components/Navbar.jsx).
- **Search Page**: Ditambahkan Suspense di [page.js](src/app/search/page.js).
- **Membership Page**: Ditambahkan Suspense di [page.js](src/app/membership/page.js).

### Redirect Fix

Memperbaiki masalah login yang tiba-tiba mengarah ke `localhost` saat di production dengan memastikan environment variable `NEXT_PUBLIC_API_URL` dikonfigurasi dengan benar di dashboard Vercel.

### Google Translate Proxy

Implementasi di: [route.js](src/app/translate-google/route.js)

- Menggantikan fungsi `proxy_server.mjs` lama agar berjalan di dalam Next.js API Routes.
- Menggunakan rotasi proxy untuk menghindari limitasi API Google Translate.
- Dilengkapi dengan fitur `applyInformalStyle` untuk mengubah hasil terjemahan menjadi bahasa gaul (Aku/Kamu/Gak/Udah).

---

## 3. Environment Variables (Vercel)

Pastikan variabel berikut ada di Vercel:

- `NEXT_PUBLIC_API_URL`: URL backend production.
- `NEXT_PUBLIC_PROXY_URL`: Harus mengarah ke domain frontend itu sendiri (contoh: `https://kolektaku.vercel.app`).

---

## 4. Cara Kerja Streaming Saat Ini

1. Player memanggil `/proxy?url=URL_STREAM_M3U8`.
2. Proxy mengambil isi `.m3u8`, mengubah semua link di dalamnya agar lewat `/proxy`, lalu mengembalikan isinya ke player.
3. Player memanggil segmen video lewat `/proxy?url=URL_SEGMEN_TS`.
4. Proxy mencari proxy IP yang cocok menggunakan hashing URL, lalu mengambil data video dan mengirimkannya ke player.

**Status Terakhir**:

- Push ke GitHub: Selesai (Commit: `fix: implement sticky proxy and m3u8 rewriting`)
- Deployment: Siap ditest di Vercel.
