import { Request, Response } from 'express';
import { createReportService, getReportsService, CreateReportPayload } from '../services/reportService';

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

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { longitude, latitude, maxDistance } = req.query;

    const filter = {
      longitude: longitude !== undefined ? parseFloat(String(longitude)) : undefined,
      latitude: latitude !== undefined ? parseFloat(String(latitude)) : undefined,
      maxDistanceMeters: maxDistance !== undefined ? parseFloat(String(maxDistance)) : undefined,
    };

    const reports = await getReportsService(filter);

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Controller - getReports] Gagal memvalidasi atau memproses request GET /api/reports: ${errorMessage}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi galat internal pada peladen saat mengambil daftar laporan.',
      error: errorMessage,
    });
  }
};
