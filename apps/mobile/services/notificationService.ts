import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh as onTokenRefreshFn,
  requestPermission,
  setBackgroundMessageHandler,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import { Alert } from 'react-native';
import { getApiUrl } from './apiService';

/**
 * Meminta izin notifikasi push dari pengguna.
 * Mengembalikan true jika izin diberikan, false jika ditolak.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const messaging = getMessaging();
    const authStatus = await requestPermission(messaging);
    const isAuthorized =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (isAuthorized) {
      console.log('[FCM] Izin notifikasi diberikan oleh pengguna.');
    } else {
      console.warn('[FCM] Izin notifikasi DITOLAK oleh pengguna.');
    }

    return isAuthorized;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error FCM] Gagal meminta izin notifikasi: ${errorMessage}`);
    return false;
  }
};

/**
 * Mengambil token FCM perangkat. Token ini unik per instalasi app.
 * Mengembalikan string token atau null jika gagal.
 */
export const getFcmDeviceToken = async (): Promise<string | null> => {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging);
    console.log(`[FCM] Token perangkat diperoleh: ${token.substring(0, 20)}...`);
    return token;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error FCM] Gagal mengambil token perangkat: ${errorMessage}`);
    return null;
  }
};

/**
 * Mengirim token FCM ke backend untuk disimpan di profil user.
 * PUT /api/auth/fcm-token
 */
export const registerFcmTokenToServer = async (
  fcmToken: string,
  authToken: string
): Promise<boolean> => {
  try {
    const apiUrl = getApiUrl('/auth/fcm-token');
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcmToken }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `HTTP Error ${response.status}`);
    }

    console.log('[FCM] Token berhasil didaftarkan ke peladen.');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error FCM] Gagal mendaftarkan token ke peladen: ${errorMessage}`);
    return false;
  }
};

/**
 * Menghapus token FCM dari backend saat user logout.
 * DELETE /api/auth/fcm-token
 */
export const deleteFcmTokenFromServer = async (authToken: string): Promise<void> => {
  try {
    const apiUrl = getApiUrl('/auth/fcm-token');
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `HTTP Error ${response.status}`);
    }

    console.log('[FCM] Token berhasil dihapus dari peladen (logout).');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error FCM] Gagal menghapus token dari peladen: ${errorMessage}`);
  }
};

/**
 * Mendaftarkan listener untuk pesan FCM saat aplikasi di foreground.
 * Menampilkan Alert standar React Native untuk pemberitahuan darurat.
 * Mengembalikan fungsi unsubscribe untuk cleanup.
 */
export const setupForegroundMessageListener = (): (() => void) => {
  const messaging = getMessaging();
  const unsubscribe = onMessage(messaging, async (remoteMessage: RemoteMessage) => {
    try {
      console.log('[FCM Foreground] Pesan diterima:', remoteMessage.messageId);

      const title = remoteMessage.notification?.title || '⚠️ PERINGATAN ECOWARN';
      const body = remoteMessage.notification?.body || 'Terdeteksi kondisi darurat di sekitar zona Anda.';

      // Tampilkan alert standar saat aplikasi terbuka (foreground)
      Alert.alert(String(title), String(body), [{ text: 'Mengerti', style: 'default' }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error FCM Foreground] Gagal memproses pesan: ${errorMessage}`);
    }
  });

  return unsubscribe;
};

/**
 * Mendaftarkan listener untuk token refresh.
 * Token FCM bisa berubah kapan saja (reinstall, clear data, dll).
 * Mengembalikan fungsi unsubscribe untuk cleanup.
 */
export const onTokenRefresh = (
  authToken: string
): (() => void) => {
  const messaging = getMessaging();
  const unsubscribe = onTokenRefreshFn(messaging, async (newToken: string) => {
    try {
      console.log(`[FCM] Token diperbarui: ${newToken.substring(0, 20)}...`);
      await registerFcmTokenToServer(newToken, authToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error FCM Token Refresh] Gagal memperbarui token: ${errorMessage}`);
    }
  });

  return unsubscribe;
};



/**
 * Mendaftarkan background message handler.
 * Harus dipanggil di top-level (di luar komponen React).
 */
export const registerBackgroundHandler = (
  handler: (message: RemoteMessage) => Promise<void>
): void => {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, handler);
};

/**
 * Workflow lengkap registrasi FCM: request permission → get token → kirim ke server.
 * Dipanggil setelah login/register berhasil.
 */
export const initializeFcm = async (authToken: string): Promise<void> => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('[FCM] Registrasi FCM dibatalkan: izin notifikasi ditolak.');
      return;
    }

    const fcmToken = await getFcmDeviceToken();
    if (!fcmToken) {
      console.warn('[FCM] Registrasi FCM dibatalkan: gagal mendapatkan token.');
      return;
    }

    await registerFcmTokenToServer(fcmToken, authToken);
    console.log('[FCM] Inisialisasi FCM selesai.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error FCM] Gagal menginisialisasi FCM: ${errorMessage}`);
  }
};
