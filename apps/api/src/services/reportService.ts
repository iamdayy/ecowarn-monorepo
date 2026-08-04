import { Report, IReport, TrashVolumeStatus, AreaType } from '../models/ReportSchema';
import { broadcastCriticalAlert, handleSpatialDeescalation } from './alertService';
import { getSocketServer } from '../config/socket';
import { uploadPhotoToFirebaseStorage } from './storageService';

const DEFAULT_MAX_DISTANCE_METERS = 25000; // 25 km default radius filter
const EVENT_NEW_REPORT = 'NEW_REPORT';
const EVENT_REPORT_RESOLVED = 'REPORT_RESOLVED';

export interface CreateReportPayload {
  reporterId: string;
  longitude: number;
  latitude: number;
  severity: TrashVolumeStatus;
  photoUrl?: string;
  areaType?: AreaType;
}

export interface SpatialQueryFilter {
  longitude?: number;
  latitude?: number;
  maxDistanceMeters?: number;
}

export const createReportService = async (payload: CreateReportPayload): Promise<IReport> => {
  try {
    const { reporterId, longitude, latitude, severity, photoUrl, areaType } = payload;

    // Jika foto dikirim dalam format Base64 dan bucket Firebase Storage terisi di env, otomatis unggah ke Cloud Storage!
    let processedPhotoUrl = photoUrl;
    if (photoUrl && photoUrl.startsWith('data:image/')) {
      processedPhotoUrl = await uploadPhotoToFirebaseStorage(photoUrl, 'reports');
    }

    const newReport = await Report.create({
      reporterId,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      severity,
      areaType,
      photoUrl: processedPhotoUrl,
    });

    // Pancarkan event real-time ke seluruh klien pemantau agar marker peta terperbarui
    try {
      const io = getSocketServer();
      io.emit(EVENT_NEW_REPORT, newReport);
    } catch (socketError) {
      console.warn('[Warning Socket Engine] Socket server belum aktif atau gagal mengirim event NEW_REPORT.');
    }

    // Evaluasi potensi bencana 500 meter paska masuknya laporan sumbatan baru
    if (severity === 'Kritis' || severity === 'Sedang') {
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

/**
 * Mengambil riwayat laporan yang dikerjakan dan diinfeksi AI oleh akun Relawan terpilih
 */
export const getReportsByReporterService = async (reporterId: string): Promise<IReport[]> => {
  try {
    return await Report.find({ reporterId }).sort({ createdAt: -1 }).limit(100);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Service - getReportsByReporterService] Gagal memproses pencarian riwayat relawan: ${errorMessage}`);
    throw new Error(`Gagal mengambil riwayat laporan relawan: ${errorMessage}`);
  }
};

/**
 * Memanipulasi status laporan menjadi RESOLVED, menyimpan bukti foto setelah penanganan,
 * dan memicu kalkulasi ulang de-eskalasi banjir rob dalam radius 500 meter.
 */
export const resolveReportService = async (reportId: string, userId: string, resolvedPhotoUrl?: string): Promise<IReport> => {
  try {
    let processedResolvedPhotoUrl = resolvedPhotoUrl;
    if (resolvedPhotoUrl && resolvedPhotoUrl.startsWith('data:image/')) {
      processedResolvedPhotoUrl = await uploadPhotoToFirebaseStorage(resolvedPhotoUrl, 'resolved_reports');
    }

    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      {
        status: 'RESOLVED',
        resolvedBy: userId,
        resolvedAt: new Date(),
        ...(processedResolvedPhotoUrl ? { resolvedPhotoUrl: processedResolvedPhotoUrl } : {}),
      },
      { new: true }
    );

    if (!updatedReport) {
      throw new Error('Laporan tidak ditemukan di database.');
    }

    // Pancarkan event real-time pemutakhiran status ke seluruh klien
    try {
      const io = getSocketServer();
      io.emit(EVENT_REPORT_RESOLVED, updatedReport);
    } catch (socketError) {
      console.warn('[Warning Socket Engine] Socket server belum aktif atau gagal mengirim event REPORT_RESOLVED.');
    }

    // Eksekusi evaluasi de-eskalasi zona aman
    await handleSpatialDeescalation(updatedReport);

    return updatedReport;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Service - resolveReportService] Gagal menyelesaikan insiden laporan: ${errorMessage}`);
    throw new Error(`Gagal menyelesaikan insiden: ${errorMessage}`);
  }
};
