import { TrashVolumeStatus, AreaType } from '../types/ecowarn';

// Konstanta global aturan Bounding Box Ratio
export const RATIO_THRESHOLD_CRITICAL = 0.35; // >= 35% luas layar tercemar/kritis (Sungai)
export const RATIO_THRESHOLD_MEDIUM = 0.15;   // >= 15% luas layar tercemar/sedang (Sungai)

// Threshold sensitif untuk area Selokan / drainase sempit yang mudah meluap/tersumbat total
export const RATIO_THRESHOLD_SELOKAN_CRITICAL = 0.25; // >= 25% luas layar langsung Kritis di Selokan
export const RATIO_THRESHOLD_SELOKAN_MEDIUM = 0.10;   // >= 10% luas layar Sedang di Selokan

/**
 * Menghitung persentase luas bounding box sampah terhadap luas dimensi frame kamera (Client-Side)
 */
export const calculateBoundingBoxRatio = (
  boxWidth: number,
  boxHeight: number,
  frameWidth: number,
  frameHeight: number
): number => {
  'worklet';
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
 * Menentukan klasifikasi keparahan sampah berdasarkan nilai rasio luas area dan spesifikasi lokasi fisik
 */
export const determineSeverityStatus = (ratio: number, areaType?: AreaType): TrashVolumeStatus => {
  'worklet';
  const critThreshold = areaType === 'Selokan' ? 0.25 : RATIO_THRESHOLD_CRITICAL;
  const medThreshold = areaType === 'Selokan' ? 0.10 : RATIO_THRESHOLD_MEDIUM;

  if (ratio >= critThreshold) {
    return 'Kritis';
  } else if (ratio >= medThreshold) {
    return 'Sedang';
  }
  return 'Ringan';
};
