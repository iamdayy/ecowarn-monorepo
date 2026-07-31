import { Request, Response } from 'express';
import { createReportService, CreateReportPayload } from '../services/reportService';

export const createReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { longitude, latitude, severity } = req.body as CreateReportPayload;

    if (longitude === undefined || latitude === undefined || !severity) {
      res.status(400).json({
        success: false,
        message: 'Payload tidak lengkap. Wajib menyertakan longitude, latitude, dan severity.',
      });
      return;
    }

    const report = await createReportService({
      longitude: Number(longitude),
      latitude: Number(latitude),
      severity,
    });

    res.status(201).json({
      success: true,
      message: 'Laporan peringatan dini berhasil disimpan.',
      data: report,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Controller - createReport] Gagal memvalidasi atau memproses request POST /api/reports: ${errorMessage}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi galat internal pada peladen saat menyimpan laporan.',
      error: errorMessage,
    });
  }
};
