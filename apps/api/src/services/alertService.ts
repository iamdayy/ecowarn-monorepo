import { Report, IReport } from '../models/ReportSchema';
import { getSocketServer } from '../config/socket';
import { sendCriticalPushNotification } from './fcmService';

const SPATIAL_RADIUS_METERS = 500; // 500 meter radius pencarian zona bahaya rob/sumbatan
const EVENT_CRITICAL_ZONE_ALERT = 'CRITICAL_ZONE_ALERT';
const EVENT_ZONE_ALL_CLEAR = 'ZONE_ALL_CLEAR';

export interface CriticalZoneBroadcastPayload {
  alertId: string;
  reporterId: string;
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
      status: { $ne: 'RESOLVED' }, // Mengabaikan laporan yang telah diselesaikan
    });

    // jika ini laporan pertama maka kirim peringatan
    if (impactedReports.length === 1) {
      const broadcastPayload: CriticalZoneBroadcastPayload = {
        alertId: (criticalReport._id as unknown as string).toString(),
        reporterId: (criticalReport.reporterId as unknown as string).toString(),
        timestamp: new Date(),
        centerCoordinates: [longitude, latitude],
        impactedRadiusMeters: SPATIAL_RADIUS_METERS,
        totalNearbyReports: impactedReports.length,
        message: `POTENSI BENCANA BANJIR ROB / SUMBATAN! Terdeteksi ${impactedReports.length} titik sumbatan berbahaya dalam lingkup 500 meter!`,
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
      reporterId: (criticalReport.reporterId as unknown as string).toString(),
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

export interface AllClearBroadcastPayload {
  alertId: string;
  timestamp: Date;
  centerCoordinates: [number, number];
  clearedRadiusMeters: number;
  message: string;
}

/**
 * Meneropong evaluasi zona spasial paska penyelesaian laporan sumbatan.
 * Apabila tiada lagi titik sumbatan berbahaya di bawah 500m, pancarkan sinyal aman (ALL CLEAR).
 */
export const handleSpatialDeescalation = async (resolvedReport: IReport): Promise<void> => {
  try {
    const [longitude, latitude] = resolvedReport.location.coordinates;

    const remainingCriticalReports = await Report.countDocuments({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: SPATIAL_RADIUS_METERS,
        },
      },
      severity: { $in: ['Kritis', 'Sedang'] },
      status: { $ne: 'RESOLVED' },
    });

    if (remainingCriticalReports === 0) {
      const allClearPayload: AllClearBroadcastPayload = {
        alertId: `CLEAN_${(resolvedReport._id as unknown as string).toString()}`,
        timestamp: new Date(),
        centerCoordinates: [longitude, latitude],
        clearedRadiusMeters: SPATIAL_RADIUS_METERS,
        message: 'ZONA STERIL: Seluruh tumpukan sampah & sumbatan air dalam lingkup 500 meter telah diselesaikan. Potensi banjir rob berakhir!',
      };

      const io = getSocketServer();
      io.emit(EVENT_ZONE_ALL_CLEAR, allClearPayload);
      console.log(`[Real-Time De-escalation] Sinyal ALL-CLEAR dipancarkan pada zona (${longitude}, ${latitude})`);

      await sendCriticalPushNotification([longitude, latitude], {
        alertId: allClearPayload.alertId,
        title: '🟢 ZONA AMAN ECOWARN',
        message: allClearPayload.message,
        centerCoordinates: allClearPayload.centerCoordinates,
        impactedRadiusMeters: allClearPayload.clearedRadiusMeters,
        totalNearbyReports: 0,
        type: EVENT_ZONE_ALL_CLEAR,
        color: '#00FF00',
      });
    } else {
      console.log(`[De-escalation Engine] Evaluasi zona (${longitude}, ${latitude}): Masih terdapat ${remainingCriticalReports} titik bahaya aktif.`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error De-escalation Engine] Gagal mengevaluasi zona aman atau broadcast Socket.io: ${errorMessage}`);
  }
};

