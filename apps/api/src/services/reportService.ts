import { Report, IReport, TrashVolumeStatus } from '../models/ReportSchema';

export interface CreateReportPayload {
  longitude: number;
  latitude: number;
  severity: TrashVolumeStatus;
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

    return newReport;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Service - createReportService] Gagal menyimpan laporan baru ke database: ${errorMessage}`);
    throw new Error(`Gagal menyimpan laporan: ${errorMessage}`);
  }
};
