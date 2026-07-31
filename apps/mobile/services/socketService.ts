import { io, Socket } from 'socket.io-client';
import { ServerReportResponse, getBaseServerUrl } from './apiService';

const SOCKET_SERVER_URL = process.env.EXPO_PUBLIC_SOCKET_URL || getBaseServerUrl();
const EVENT_CRITICAL_ZONE_ALERT = 'CRITICAL_ZONE_ALERT';
const EVENT_NEW_REPORT = 'NEW_REPORT';

export interface CriticalZoneAlertPayload {
  alertId: string;
  timestamp: string;
  centerCoordinates: [number, number]; // [longitude, latitude]
  impactedRadiusMeters: number;
  totalNearbyReports: number;
  message: string;
}

let socketInstance: Socket | null = null;

/**
 * Mendaftarkan koneksi Real-Time Engine via Socket.io dan memantau siaran darurat
 */
export const connectRealtimeEngine = (
  onCriticalAlert: (payload: CriticalZoneAlertPayload) => void,
  onNewReport: (report: ServerReportResponse) => void
): Socket | null => {
  try {
    if (socketInstance && socketInstance.connected) {
      return socketInstance;
    }

    socketInstance = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket Client] Berhasil terhubung ke Real-Time Engine (${SOCKET_SERVER_URL}) dengan ID: ${socketInstance?.id}`);
    });

    socketInstance.on(EVENT_CRITICAL_ZONE_ALERT, (payload: CriticalZoneAlertPayload) => {
      console.warn('[Real-Time Alert] Diterima broadcast darurat zona kritis dari peladen!', payload);
      onCriticalAlert(payload);
    });

    socketInstance.on(EVENT_NEW_REPORT, (report: ServerReportResponse) => {
      console.log('[Real-Time Engine] Diterima penambahan laporan baru:', report._id);
      onNewReport(report);
    });

    socketInstance.on('connect_error', (err: Error) => {
      console.error(`[Error Socket Connect] Gagal terhubung ke Socket.io: ${err.message}`);
    });

    socketInstance.on('disconnect', (reason: string) => {
      console.log(`[Socket Client] Koneksi terputus: ${reason}`);
    });

    return socketInstance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Socket Service] Galat saat menginisialisasi Socket.io: ${errorMessage}`);
    return null;
  }
};

export const disconnectRealtimeEngine = (): void => {
  try {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      console.log('[Socket Client] Real-Time Engine dihentikan secara manual.');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Socket Service - disconnect] Gagal memutus koneksi socket: ${errorMessage}`);
  }
};
