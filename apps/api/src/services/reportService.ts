import { Report, IReport, TrashVolumeStatus } from '../models/ReportSchema';
import { broadcastCriticalAlert } from './alertService';
import { getSocketServer } from '../config/socket';

const DEFAULT_MAX_DISTANCE_METERS = 25000; // 25 km default radius filter
const EVENT_NEW_REPORT = 'NEW_REPORT';

export interface CreateReportPayload {
  longitude: number;
  latitude: number;
  severity: TrashVolumeStatus;
}

export interface SpatialQueryFilter {
  longitude?: number;
  latitude?: number;
  maxDistanceMeters?: number;
}

export const createReportService = async (payload: CreateReportPayload): Promise<IReport> => {
  try {
    const { longitude, latitude, severity } = payload;

    const newReport = await Report.create({
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      severity,
    });

    // Pancarkan event real-time ke seluruh klien pemantau agar marker peta terperbarui
    try {
      const io = getSocketServer();
      io.emit(EVENT_NEW_REPORT, newReport);
    } catch (socketError) {
      console.warn('[Warning Socket Engine] Socket server belum aktif atau gagal mengirim event NEW_REPORT.');
    }

    if (severity === 'Kritis') {
      await broadcastCriticalAlert(newReport);
    }

    return newReport;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Service - createReportService] Gagal menyimpan laporan baru ke database: ${errorMessage}`);
    throw new Error(`Gagal menyimpan laporan: ${errorMessage}`);
  }
};

/**
 * Wajib menggunakan kueri geospasial bawaan MongoDB ($nearSphere) untuk menyaring laporan dalam radius spasial
 */
export const getReportsService = async (filter: SpatialQueryFilter): Promise<IReport[]> => {
  try {
    const { longitude, latitude, maxDistanceMeters = DEFAULT_MAX_DISTANCE_METERS } = filter;

    if (longitude !== undefined && latitude !== undefined && !isNaN(longitude) && !isNaN(latitude)) {
      return await Report.find({
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [Number(longitude), Number(latitude)],
            },
            $maxDistance: Number(maxDistanceMeters),
          },
        },
      }).limit(100);
    }

    // Jika koordinat tidak diberikan, ambil 100 laporan terbaru
    return await Report.find().sort({ createdAt: -1 }).limit(100);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Service - getReportsService] Gagal memproses kueri spasial MongoDB: ${errorMessage}`);
    throw new Error(`Gagal mengambil data laporan: ${errorMessage}`);
  }
};
