import { isFirebaseInitialized, getFirebaseMessaging } from '../config/firebase';
import { User } from '../models/UserSchema';
import type { SendResponse } from 'firebase-admin/messaging';

const FCM_BATCH_LIMIT = 500; // Batas maksimum token per batch multicast FCM
const NOTIFICATION_CHANNEL_ID = 'ecowarn_critical_alert';

export interface FcmAlertPayload {
  alertId: string;
  message: string;
  centerCoordinates: [number, number];
  impactedRadiusMeters: number;
  totalNearbyReports: number;
  title?: string;
  type?: string;
  color?: string;
}

/**
 * Mengirim push notification massal ke semua perangkat yang memiliki fcmToken terdaftar.
 * Menggunakan sendEachForMulticast (pengganti sendMulticast yang deprecated).
 * Token yang gagal (stale/expired) otomatis dihapus dari database.
 */
export const sendCriticalPushNotification = async (
  coordinates: [number, number],
  alertPayload: FcmAlertPayload
): Promise<void> => {
  try {
    // Periksa apakah Firebase Admin sudah terinisialisasi
    if (!isFirebaseInitialized()) {
      console.warn('[FCM Service] Firebase Admin belum terinisialisasi. Push notification dilewati.');
      return;
    }

    // Ambil semua user yang memiliki fcmToken aktif
    const usersWithTokens = await User.find({
      fcmToken: { $exists: true, $nin: [null, ''] },
    }).select('fcmToken _id');

    if (usersWithTokens.length === 0) {
      console.log('[FCM Service] Tidak ada perangkat terdaftar untuk menerima push notification.');
      return;
    }

    const allTokens = usersWithTokens
      .map((user) => user.fcmToken)
      .filter((token): token is string => !!token);

    console.log(`[FCM Service] Mengirim push notification darurat ke ${allTokens.length} perangkat...`);

    const messaging = getFirebaseMessaging();

    // Bagi token ke batch (max 500 per batch — limit FCM)
    for (let i = 0; i < allTokens.length; i += FCM_BATCH_LIMIT) {
      const batchTokens = allTokens.slice(i, i + FCM_BATCH_LIMIT);

      const multicastMessage = {
        tokens: batchTokens,
        notification: {
          title: alertPayload.title || '⚠️ PERINGATAN DARURAT ECOWARN',
          body: alertPayload.message,
        },
        data: {
          alertId: alertPayload.alertId,
          longitude: String(coordinates[0]),
          latitude: String(coordinates[1]),
          impactedRadiusMeters: String(alertPayload.impactedRadiusMeters),
          totalNearbyReports: String(alertPayload.totalNearbyReports),
          type: alertPayload.type || 'CRITICAL_ZONE_ALERT',
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: NOTIFICATION_CHANNEL_ID,
            color: alertPayload.color || '#FF0000',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
      };

      try {
        const response = await messaging.sendEachForMulticast(multicastMessage);

        console.log(
          `[FCM Service] Batch ${Math.floor(i / FCM_BATCH_LIMIT) + 1}: ` +
          `${response.successCount} berhasil, ${response.failureCount} gagal.`
        );

        // Hapus stale/expired tokens dari database
        if (response.failureCount > 0) {
          await cleanupStaleTokens(batchTokens, response.responses);
        }
      } catch (batchError) {
        const errorMessage = batchError instanceof Error ? batchError.message : String(batchError);
        console.error(`[Error FCM Service] Gagal mengirim batch multicast: ${errorMessage}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error FCM Service] Gagal memproses push notification massal: ${errorMessage}`);
  }
};

/**
 * Menghapus fcmToken yang sudah expired/invalid dari database
 * agar tidak mengganggu pengiriman berikutnya.
 */
const cleanupStaleTokens = async (
  tokens: string[],
  responses: SendResponse[]
): Promise<void> => {
  try {
    const staleTokens: string[] = [];

    responses.forEach((resp, index) => {
      if (
        resp.error &&
        (resp.error.code === 'messaging/registration-token-not-registered' ||
          resp.error.code === 'messaging/invalid-registration-token')
      ) {
        staleTokens.push(tokens[index]);
      }
    });

    if (staleTokens.length > 0) {
      await User.updateMany(
        { fcmToken: { $in: staleTokens } },
        { $set: { fcmToken: null } }
      );
      console.log(`[FCM Service] ${staleTokens.length} stale token dihapus dari database.`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error FCM Service - cleanupStaleTokens] Gagal membersihkan token: ${errorMessage}`);
  }
};
