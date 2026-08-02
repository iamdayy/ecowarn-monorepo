import type { RemoteMessage } from '@react-native-firebase/messaging';

/**
 * Handler untuk pesan FCM yang masuk saat aplikasi di background/killed state.
 * Didaftarkan via registerBackgroundHandler() di top-level _layout.tsx.
 *
 * Saat OS Android menerima pesan FCM data-only atau saat app dalam killed state,
 * sistem OS Android FCM otomatis menangani notifikasi push pada system tray.
 */
export const handleBackgroundMessage = async (
  remoteMessage: RemoteMessage
): Promise<void> => {
  try {
    console.log('[FCM Background] Pesan latar belakang diterima:', remoteMessage.messageId);
    console.log('[FCM Background] Detail:', JSON.stringify(remoteMessage.notification || remoteMessage.data));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error FCM Background] Gagal memproses pesan latar belakang: ${errorMessage}`);
  }
};
