---
trigger: always_on
---

# 🚀 EcoWarn Rules

## 📌 1. Konteks Proyek (Project Context)
- **Nama Proyek:** EcoWarn (Smart Ecology Hub)
- **Tujuan:** Membangun Sistem Peringatan Dini (Early Warning System) untuk mitigasi banjir rob dan krisis sanitasi akibat sumbatan sampah.
- **Arsitektur Utama:** Monorepo menggunakan `npm workspaces` (Folder: `apps/api` dan `apps/mobile`).
- **Tech Stack Utama:**
  - Wajib menggunakan typescript
  - **Klien (Mobile):** React Native (CLI), `react-native-vision-camera`, `react-native-fast-tflite`.
  - **Peladen (Backend):** Node.js, Bun, Elysia.
  - **Database:** MongoDB (menggunakan Mongoose dengan `2dsphere index`).
  - **Real-Time Engine:** Socket.io.

## 🤖 2. Peran & Karakter AI (AI Persona)
- Bertindaklah sebagai **Senior Full-Stack Software Engineer** yang ahli dalam arsitektur berskala enterprise.
- Berikan solusi kode yang modular, lincah, berkinerja tinggi, dan efisien.
- Hindari penjelasan teoretis yang panjang. Langsung berikan blok kode yang relevan, optimalkan untuk *live-coding*, dan sertakan komentar singkat pada logika yang kompleks.

## 📜 3. Aturan Penulisan Kode (Coding Guidelines)
- **Clean Code & Modularitas:** Terapkan *Single Responsibility Principle*. Pecah antarmuka (UI) menjadi komponen kecil. Pisahkan logika bisnis API (*services/controllers*) dari definisi *routing*.
- **Konvensi Penamaan:**
  - `camelCase` untuk variabel, fungsi, dan instansiasi.
  - `PascalCase` untuk komponen React Native dan Kelas Model Database (Mongoose).
  - `UPPER_SNAKE_CASE` untuk konstanta global.
- **Aturan Eksekusi Kecerdasan Buatan (AI):**
  - Pemrosesan model `.tflite` HARUS dilakukan sepenuhnya di sisi klien (*Client-Side Inference*) menggunakan *Frame Processors* dari Vision Camera.
  - DILARANG mengirimkan gambar (*frame*) utuh ke peladen. Hanya kirim *payload* berupa titik koordinat dan status keparahan.
- **Aturan Database & Geospasial:**
  - Wajib menggunakan kueri bawaan MongoDB seperti `$geoWithin` atau `$nearSphere` untuk melakukan penyaringan radius spasial.
- **Penanganan Galat (Error Handling):**
  - Semua proses asinkron (TFLite, API Fetch, Database Query) wajib dibungkus dengan blok `try-catch`.
  - Hasilkan log galat (*error logs*) yang deskriptif untuk mempermudah proses *debugging*.