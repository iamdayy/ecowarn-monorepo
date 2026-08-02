---
description: menambah FCM
---

## Fase 6: Notifikasi Belakang Layar (FCM & Background Services)
**Fokus Tugas:** Memastikan gawai warga terdampak tetap memunculkan peringatan pop-up meskipun aplikasi sedang ditutup (*killed state*).

1. **Konfigurasi Mobile (React Native Firebase):**
   - Pasang `@react-native-firebase/app` dan `@react-native-firebase/messaging`.
   - Buat fungsi *request permission* saat aplikasi dibuka pertama kali.
   - Ambil token FCM perangkat menggunakan `messaging().getToken()` dan kirimkan ke *backend* untuk disimpan di profil pengguna.

2. **Penanganan Pesan Latar Belakang (Headless JS):**
   - Di file `index.js` (akar `apps/mobile`), daftarkan `messaging().setBackgroundMessageHandler()`.
   - Tulis logika agar saat pesan darurat masuk, OS memunculkan *banner* merah dan suara peringatan (integrasikan dengan Notifee jika perlu kustomisasi tampilan ekstra).

3. **Konfigurasi Backend (Firebase Admin):**
   - Instal `firebase-admin` di `apps/api`.
   - Modifikasi *controller* laporan: Saat laporan berstatus 'Kritis' masuk, jalankan kueri spasial `$geoWithin` untuk mencari area terdampak.
   - Tarik semua `fcmToken` dari `User` yang berada di dalam radius spasial tersebut.
   - Eksekusi `admin.messaging().sendMulticast()` untuk menembakkan notifikasi massal ke gawai warga.