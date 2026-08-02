import { initializeApp, getApps, App } from 'firebase-admin/app';
import { cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

let firebaseApp: App | null = null;

/**
 * Inisialisasi Firebase Admin SDK untuk mengirim push notification FCM dari peladen.
 * Telah dioptimasi untuk lingkungan Serverless (Vercel) maupun pengembangan lokal.
 */
export const initFirebase = (): void => {
  try {
    // Mencegah inisialisasi ganda pada lifecycle Serverless Vercel / Hot reload
    if (getApps().length > 0) {
      console.log('[Firebase Admin] SDK sudah aktif (Singleton / Serverless reuse).');
      return;
    }

    let serviceAccount: Record<string, string> | null = null;

    // Prioritas 1: Baca Kredensial dari Environment Variables (Wajib untuk Vercel Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (e) {
        console.error('[Error Firebase Admin] Parsing FIREBASE_SERVICE_ACCOUNT_JSON gagal:', e);
      }
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Pada Vercel Env, baris baru (\n) di private key kerap ter-escape menjadi \\n
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }

    // Prioritas 2: Fallback ke file fisik lokal serviceAccountKey.json (untuk Local Development)
    if (!serviceAccount) {
      const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
      if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      }
    }

    if (!serviceAccount) {
      console.warn(
        '[Firebase Admin] Kredensial tidak ditemukan (File serviceAccountKey.json / Env Vercel kosong). ' +
        'Push notification FCM tidak akan aktif.'
      );
      return;
    }

    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });

    console.log('[Firebase Admin] SDK berhasil diinisialisasi untuk push notification FCM.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Firebase Admin] Gagal menginisialisasi Firebase Admin SDK: ${errorMessage}`);
  }
};

/**
 * Mengecek apakah Firebase Admin sudah terinisialisasi.
 */
export const isFirebaseInitialized = (): boolean => {
  return getApps().length > 0;
};

/**
 * Mendapatkan instansi Messaging dari Firebase Admin.
 * Melempar error jika Firebase belum diinisialisasi.
 */
export const getFirebaseMessaging = (): Messaging => {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase Admin belum diinisialisasi.');
  }
  return getMessaging();
};
