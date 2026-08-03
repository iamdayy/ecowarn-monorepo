import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { isFirebaseInitialized } from '../config/firebase';

/**
 * Layanan integrasi Firebase Cloud Storage untuk memitigasi pembengkakan database MongoDB.
 * Mengonversi payload foto Base64 menjadi berkas di bucket Firebase Cloud Storage dan mengembalikan URL HTTPS publik.
 */
export const uploadPhotoToFirebaseStorage = async (base64String: string, folder: string = 'reports'): Promise<string> => {
  try {
    if (!isFirebaseInitialized() || getApps().length === 0) {
      console.log('[Storage Service] Firebase belum diinisialisasi atau FIREBASE_STORAGE_BUCKET belum diatur. Menggunakan string Base64 murni untuk DB.');
      return base64String;
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      console.log('[Storage Service] Environment variable FIREBASE_STORAGE_BUCKET belum dideklarasikan. Tetap menyimpankan data asli.');
      return base64String;
    }

    // Memisahkan metadata MIME (contoh: data:image/jpeg;base64,...) dengan data murni Base64
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let rawBase64 = base64String;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      rawBase64 = matches[2];
    }

    const imageBuffer = Buffer.from(rawBase64, 'base64');
    const fileName = `${folder}/report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;

    const bucket = getStorage().bucket(bucketName);
    const file = bucket.file(fileName);

    await file.save(imageBuffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000', // Cache 1 tahun
      },
      public: true, // Mengatur agar foto dapat dibaca secara publik oleh klien
    });

    // Mengubah penyiapan tautan menjadi URL HTTPS GCP CDN yang sah
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    console.log(`[Storage Service] Sukses mengunggah foto laporan ke Firebase Cloud Storage: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[Warning Storage Service] Gagal mengunggah foto ke Firebase Storage (${errorMessage}), fallback menggunakan Base64 asal.`);
    return base64String;
  }
};
