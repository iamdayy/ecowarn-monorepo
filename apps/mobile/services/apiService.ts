import { ReportPayload } from '../types/ecowarn';

// Menggunakan EXPO_PUBLIC_API_URL atau fallback ke alamat IP default emulator Android / localhost
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';

export interface ServerReportResponse {
  _id: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  severity: 'Ringan' | 'Sedang' | 'Kritis';
  createdAt?: string;
}

/**
 * Mengirim payload peringatan dini ke peladen (HANYA koordinat & status keparahan, TANPA GAMBAR)
 */
export const sendReportToServer = async (payload: ReportPayload): Promise<ServerReportResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
