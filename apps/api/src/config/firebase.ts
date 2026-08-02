import { initializeApp, getApps, App } from 'firebase-admin/app';
import { cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

let firebaseApp: App | null = null;

/**
 * Inisialisasi Firebase Admin SDK untuk mengirim push notification FCM dari peladen.
 * Memerlukan file serviceAccountKey.json di root folder apps/api.
 */
export const initFirebase = (): void => {
  try {
    const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');

    if (!fs.existsSync(serviceAccountPath)) {
      console.warn(
        '[Firebase Admin] File serviceAccountKey.json tidak ditemukan. ' +
        'Push notification FCM tidak akan aktif. ' +
        'Download dari Firebase Console → Project Settings → Service Accounts.'
      );
      return;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

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
