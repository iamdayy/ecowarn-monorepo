import { Report, IReport } from '../models/ReportSchema';
import { getSocketServer } from '../config/socket';
import { sendCriticalPushNotification } from './fcmService';

const SPATIAL_RADIUS_METERS = 500; // 500 meter radius pencarian zona bahaya rob/sumbatan
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

    // Kueri spasial MongoDB menggunakan $nearSphere dalam lingkup 500 meter
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
      severity: { $in: ['Kritis', 'Sedang'] }, // Menyaring laporan sumbatan/kritis
    });

    // jika ini laporan pertama maka kirim peringatan
    if (impactedReports.length === 1) {
      const broadcastPayload: CriticalZoneBroadcastPayload = {
        alertId: (criticalReport._id as unknown as string).toString(),
        timestamp: new Date(),
        centerCoordinates: [longitude, latitude],
        impactedRadiusMeters: SPATIAL_RADIUS_METERS,
        totalNearbyReports: impactedReports.length,
        message: `POTENSI BENCANA BANJIR ROB / SUMBATAN MUNNA! Terdeteksi ${impactedReports.length} titik sumbatan berbahaya dalam lingkup 500 meter!`,
      };

      const io = getSocketServer();
      io.emit(EVENT_CRITICAL_ZONE_ALERT, broadcastPayload);
      console.log(`[Real-Time Engine] Broadcast darurat dipancarkan (Total Sumbatan 500m: ${impactedReports.length} titik)`);

      // Kirim push notification FCM ke perangkat yang berada di background/killed state
      await sendCriticalPushNotification([longitude, latitude], {
        alertId: broadcastPayload.alertId,
        message: broadcastPayload.message,
        centerCoordinates: broadcastPayload.centerCoordinates,
        impactedRadiusMeters: broadcastPayload.impactedRadiusMeters,
        totalNearbyReports: broadcastPayload.totalNearbyReports,
      });
    }

    // Logika baru: Potensi bencana muncul jika terdapat 5 - 10 (atau lebih) laporan sumbatan di bawah 500 meter
    const totalSumbatan = impactedReports.length;
    if (totalSumbatan < 5) {
      console.log(`[Alert Engine] Analisis spasial pada zona (${longitude}, ${latitude}): ${totalSumbatan} laporan sumbatan terdeteksi dalam radius 500m (< 5). Potensi bencana berstatus Ringan hingga Sedang.`);
      return;
    }

    const broadcastPayload: CriticalZoneBroadcastPayload = {
      alertId: (criticalReport._id as unknown as string).toString(),
      timestamp: new Date(),
      centerCoordinates: [longitude, latitude],
      impactedRadiusMeters: SPATIAL_RADIUS_METERS,
      totalNearbyReports: totalSumbatan,
      message: `POTENSI BENCANA BANJIR ROB / SUMBATAN pada saluran air! Terdeteksi ${totalSumbatan} titik sumbatan berbahaya dalam lingkup 500 meter!`,
    };

    const io = getSocketServer();
    io.emit(EVENT_CRITICAL_ZONE_ALERT, broadcastPayload);
    console.log(`[Real-Time Engine] Broadcast darurat dipancarkan (Total Sumbatan 500m: ${totalSumbatan} titik)`);

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
