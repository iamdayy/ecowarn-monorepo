import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ReportPayload } from '../types/ecowarn';

/**
 * Mendapatkan URL peladen secara dinamis agar terhubung dengan mulus di Emulator maupun Perangkat Fisik (Wi-Fi/LAN)
 */
export const getBaseServerUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace('/api', '');
  }
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    return `http://${hostIp}:5000`;
  }
  // Fallback sesuai dengan OS yang menjalankan klien (Android Emulator vs iOS/Web/Local)
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000';
};

export const getApiUrl = (path: string): string => {
  const base = getBaseServerUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}/api${normalizedPath}`;
};

export const API_BASE_URL = `${getBaseServerUrl()}/api`;

export interface ServerReportResponse {
  _id: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  severity: 'Ringan' | 'Sedang' | 'Kritis';
  photoUrl?: string;
  createdAt?: string;
}

/**
 * Mengirim payload peringatan dini ke peladen (HANYA koordinat & status keparahan, TANPA GAMBAR)
 */
export const sendReportToServer = async (payload: ReportPayload, token?: string): Promise<ServerReportResponse> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `HTTP Error ${response.status}`);
    }

    return result.data as ServerReportResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error API Service - sendReportToServer] Gagal mengirim laporan ke ${API_BASE_URL}/reports: ${errorMessage}`);
    throw error;
  }
};

/**
 * Mengambil daftar laporan sampah dari peladen berdasarkan radius spasial terkini
 */
export const fetchNearbyReports = async (
  latitude: number,
  longitude: number,
  maxDistanceMeters: number = 25000
): Promise<ServerReportResponse[]> => {
  try {
    const url = `${API_BASE_URL}/reports?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&maxDistance=${encodeURIComponent(maxDistanceMeters)}`;
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `HTTP Error ${response.status}`);
    }

    return result.data as ServerReportResponse[];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error API Service - fetchNearbyReports] Gagal mengambil data kueri spasial: ${errorMessage}`);
    return [];
  }
};

/**
 * Mengambil daftar riwayat laporan pemantauan yang pernah diunggah oleh relawan
 */
export const fetchReporterHistory = async (token?: string): Promise<ServerReportResponse[]> => {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/reports/history`, { headers });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `HTTP Error ${response.status}`);
    }

    return result.data as ServerReportResponse[];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error API Service - fetchReporterHistory] Gagal mengambil riwayat laporan relawan: ${errorMessage}`);
    return [];
  }
};

