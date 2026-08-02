import notifee, { AndroidImportance } from '@notifee/react-native';
import type { RemoteMessage } from '@react-native-firebase/messaging';

const NOTIFICATION_CHANNEL_ID = 'ecowarn_critical_alert';

/**
 * Handler untuk pesan FCM yang masuk saat aplikasi di background/killed state.
 * Didaftarkan via registerBackgroundHandler() di top-level _layout.tsx.
 *
 * Saat OS Android menerima pesan FCM data-only atau saat app dalam killed state,
 * handler ini menampilkan notifikasi Notifee dengan style darurat (banner merah).
 */
export const handleBackgroundMessage = async (
  remoteMessage: RemoteMessage
): Promise<void> => {
  try {
    console.log('[FCM Background] Pesan latar belakang diterima:', remoteMessage.messageId);

    const title = remoteMessage.notification?.title || '⚠️ PERINGATAN DARURAT';
    const body =
      remoteMessage.notification?.body ||
      (remoteMessage.data?.message as string | undefined) ||
      'Terdeteksi kondisi darurat di sekitar zona Anda. Buka aplikasi EcoWarn untuk detail.';

    // Tampilkan notifikasi kustom via Notifee dengan banner merah
    await notifee.displayNotification({
      title: String(title),
      body: String(body),
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        color: '#FF0000',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_notification',
      },
    });

    console.log('[FCM Background] Notifikasi darurat berhasil ditampilkan.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error FCM Background] Gagal menampilkan notifikasi latar belakang: ${errorMessage}`);
  }
};
