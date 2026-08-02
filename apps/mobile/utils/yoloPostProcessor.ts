import { TrashVolumeStatus, BoundingBox } from '../types/ecowarn';
import { calculateBoundingBoxRatio, determineSeverityStatus } from './volumeCalculator';

export interface YoloInputConfig {
  width: number;
  height: number;
  expectedBytes: number;
  isFloat: boolean;
  isValid: boolean;
}

export interface YoloOutputConfig {
  numCandidates: number;
  numAttributes: number;
  isTransposed: boolean;
  isValid: boolean;
}

export interface YoloDetectionResult {
  hasDetection: boolean;
  ratio: number;
  severity: TrashVolumeStatus;
  boundingBox?: BoundingBox;
}

/**
 * Pemroses pasca-indera AI (Post-Processor) untuk hasil deteksi model TFLite YOLO.
 * Dieksekusi secara native di dalam Worklet Thread sehingga membutuhkan direktif 'worklet'.
 * Menerapkan Single Responsibility Principle untuk menjaga kebersih an dan modularitas kode UI.
 */
export const processYoloInference = (
  outputMatrix: Float32Array,
  inputConfig: YoloInputConfig,
  outputConfig: YoloOutputConfig,
  frameWidth: number,
  frameHeight: number,
  confidenceThreshold: number
): YoloDetectionResult => {
  'worklet';
  const numCandidates = outputConfig.numCandidates;
  const numAttributes = outputConfig.numAttributes;
  const isTransposed = outputConfig.isTransposed;

  let maxScore = 0.0;
  let bestX = 0.0;
  let bestY = 0.0;
  let bestWidth = 0.0;
  let bestHeight = 0.0;

  // Cache-Friendly Matrix Traversal (Optimasi Ekstrem Hermes CPU Worklet)
  if (isTransposed) {
    const offsetX = 0;
    const offsetY = numCandidates;
    const offsetW = numCandidates * 2;
    const offsetH = numCandidates * 3;

    for (let c = 4; c < numAttributes; c++) {
      const offsetC = numCandidates * c;
      for (let i = 0; i < numCandidates; i++) {
        const score = outputMatrix[offsetC + i]!;
        if (score > maxScore) {
          const w = outputMatrix[offsetW + i]!;
          const h = outputMatrix[offsetH + i]!;

          // Filter anomali bounding box raksasa (>96% dari ukuran layar)
          const normWTest = w > 1.0 ? w / inputConfig.width : w;
          const normHTest = h > 1.0 ? h / inputConfig.height : h;
          if (normWTest > 0.96 && normHTest > 0.96 && score < 0.70) {
            continue;
          }

          maxScore = score;
          bestX = outputMatrix[offsetX + i]!;
          bestY = outputMatrix[offsetY + i]!;
          bestWidth = w;
          bestHeight = h;
        }
      }
    }
  } else {
    for (let i = 0; i < numCandidates; i++) {
      const baseIdx = i * numAttributes;
      for (let c = 4; c < numAttributes; c++) {
        const score = outputMatrix[baseIdx + c]!;
        if (score > maxScore) {
          const w = outputMatrix[baseIdx + 2]!;
          const h = outputMatrix[baseIdx + 3]!;

          const normWTest = w > 1.0 ? w / inputConfig.width : w;
          const normHTest = h > 1.0 ? h / inputConfig.height : h;
          if (normWTest > 0.96 && normHTest > 0.96 && score < 0.70) {
            continue;
          }

          maxScore = score;
          bestX = outputMatrix[baseIdx + 0]!;
          bestY = outputMatrix[baseIdx + 1]!;
          bestWidth = w;
          bestHeight = h;
        }
      }
    }
  }

  if (maxScore >= confidenceThreshold) {
    const boxWidthPx = bestWidth > 1.0 ? (bestWidth / inputConfig.width) * frameWidth : bestWidth * frameWidth;
    const boxHeightPx = bestHeight > 1.0 ? (bestHeight / inputConfig.height) * frameHeight : bestHeight * frameHeight;
    const ratio = calculateBoundingBoxRatio(boxWidthPx, boxHeightPx, frameWidth, frameHeight);
    const severity = determineSeverityStatus(ratio);

    // KONVERSI KOORDINAT PRESISI AKURAT (Top-Left corner X_min, Y_min):
    const normCx = bestX > 1.0 ? bestX / inputConfig.width : bestX;
    const normCy = bestY > 1.0 ? bestY / inputConfig.height : bestY;
    const normW = bestWidth > 1.0 ? bestWidth / inputConfig.width : bestWidth;
    const normH = bestHeight > 1.0 ? bestHeight / inputConfig.height : bestHeight;

    const normX = Math.max(0, Math.min(1, normCx));
    const normY = Math.max(0, Math.min(1, normCy));
    const validW = Math.max(0, Math.min(1 - normX, normW));
    const validH = Math.max(0, Math.min(1 - normY, normH));

    return {
      hasDetection: true,
      ratio,
      severity,
      boundingBox: { x: normX, y: normY, width: validW, height: validH },
    };
  }

  return {
    hasDetection: false,
    ratio: 0.0,
    severity: 'Ringan',
    boundingBox: undefined,
  };
};
