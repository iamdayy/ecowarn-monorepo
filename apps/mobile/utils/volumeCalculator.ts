import { TrashVolumeStatus } from '../types/ecowarn';

// Konstanta global aturan Bounding Box Ratio
export const RATIO_THRESHOLD_CRITICAL = 0.35; // >= 35% luas layar tercemar/kritis
export const RATIO_THRESHOLD_MEDIUM = 0.15;   // >= 15% luas layar tercemar/sedang

/**
 * Menghitung persentase luas bounding box sampah terhadap luas dimensi frame kamera (Client-Side)
 */
export const calculateBoundingBoxRatio = (
  boxWidth: number,
  boxHeight: number,
  frameWidth: number,
  frameHeight: number
): number => {
  try {
    if (frameWidth <= 0 || frameHeight <= 0) return 0;

    const boxArea = boxWidth * boxHeight;
    const frameArea = frameWidth * frameHeight;
    const ratio = boxArea / frameArea;

    // Pastikan rasio berada pada batas rentang valid [0, 1]
    return Math.min(Math.max(ratio, 0), 1);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Calculator] Gagal menghitung Bounding Box Ratio: ${errorMessage}`);
    return 0;
  }
};

/**
 * Menentukan klasifikasi keparahan sampah berdasarkan nilai rasio luas area
 */
export const determineSeverityStatus = (ratio: number): TrashVolumeStatus => {
  if (ratio >= RATIO_THRESHOLD_CRITICAL) {
    return 'Kritis';
  } else if (ratio >= RATIO_THRESHOLD_MEDIUM) {
    return 'Sedang';
  }
  return 'Ringan';
};
