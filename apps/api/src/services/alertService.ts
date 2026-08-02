import { Report, IReport } from '../models/ReportSchema';
import { getSocketServer } from '../config/socket';
import { sendCriticalPushNotification } from './fcmService';

const SPATIAL_RADIUS_METERS = 5000; // 5 km radius pencarian zona terdampak
const EVENT_CRITICAL_ZONE_ALERT = 'CRITICAL_ZONE_ALERT';

export interface CriticalZoneBroadcastPayload {
  alertId: string;
  timestamp: Date;
  centerCoordinates: [number, number];
  impactedRadiusMeters: number;
  totalNearbyReports: number;
  message: string;
}

export const broadcastCriticalAlert = async (criticalReport: IReport): Promise<void> => {
  try {
    const [longitude, latitude] = criticalReport.location.coordinates;

    // Kueri spasial MongoDB menggunakan $nearSphere dan index 2dsphere
    const impactedReports = await Report.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: SPATIAL_RADIUS_METERS,
        },
      },
    });

    const broadcastPayload: CriticalZoneBroadcastPayload = {
      alertId: (criticalReport._id as unknown as string).toString(),
      timestamp: new Date(),
      centerCoordinates: [longitude, latitude],
      impactedRadiusMeters: SPATIAL_RADIUS_METERS,
      totalNearbyReports: impactedReports.length,
      message: 'PERINGATAN DINI: Terdeteksi krisis volume sampah berskala kritis di zona Anda!',
    };

    const io = getSocketServer();
    io.emit(EVENT_CRITICAL_ZONE_ALERT, broadcastPayload);
    console.log(`[Real-Time Engine] Broadcast darurat dipancarkan ke semua klien (Zona: ${longitude}, ${latitude})`);

    // Kirim push notification FCM ke perangkat yang berada di background/killed state
    await sendCriticalPushNotification([longitude, latitude], {
      alertId: broadcastPayload.alertId,
      message: broadcastPayload.message,
      centerCoordinates: broadcastPayload.centerCoordinates,
      impactedRadiusMeters: broadcastPayload.impactedRadiusMeters,
      totalNearbyReports: broadcastPayload.totalNearbyReports,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Alert Service] Gagal memproses kueri spasial atau broadcast Socket.io: ${errorMessage}`);
  }
};
