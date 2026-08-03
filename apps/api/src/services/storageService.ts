import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { isFirebaseInitialized } from '../config/firebase';
import crypto from 'crypto';

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

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET?.trim().replace(/^gs:\/\//, '').replace(/\/$/, '');
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

    // Buat token unduhan khas Firebase agar tautan dapat diakses publik via HTTPS
    // tanpa melanggar pembatasan hak akses (Uniform Bucket-Level Access) dari Google Cloud IAM
    const downloadToken = crypto.randomUUID();

    await file.save(imageBuffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000', // Cache 1 tahun
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    // Gunakan format standar tautan unduh publik Firebase Cloud Storage
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${downloadToken}`;
    console.log(`[Storage Service] Sukses mengunggah foto laporan ke Firebase Cloud Storage: ${publicUrl}`);

    return publicUrl;
  } catch (error: any) {
    // Mencetak objek error mentah tanpa interpolasi string agar Node/Bun mencetak seluruh isi struktur tanpa mengubahnya menjadi [object Object]
    console.error('[Error Storage Service - Raw Detail]:', error?.response?.body || error?.response?.data || error);

    let errorMessage = '';
    try {
      errorMessage = typeof error?.message === 'string' && error.message !== '[object Object]'
        ? error.message
        : JSON.stringify(error?.response?.body || error?.response?.data || error, null, 2);
    } catch (e) {
      errorMessage = String(error);
    }

    console.warn(`[Warning Storage Service] Gagal mengunggah foto ke Firebase Storage (${errorMessage}). Fallback menggunakan Base64 asal.`);
    return base64String;
  }
};
