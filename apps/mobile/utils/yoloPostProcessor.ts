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

  // Traversal & Adaptive Tensor Decoder (End2End NMS vs Raw YOLO)
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
          const raw0 = outputMatrix[offsetX + i]!;
          const raw1 = outputMatrix[offsetY + i]!;
          const raw2 = outputMatrix[offsetW + i]!;
          const raw3 = outputMatrix[offsetH + i]!;

          let xmin = 0, ymin = 0, boxW = 0, boxH = 0;

          // Deteksi Format: End2End NMS TF [y1, x1, y2, x2] vs Raw YOLO [cx, cy, w, h]
          if (raw2 > raw0 && raw3 > raw1 && raw2 <= inputConfig.width * 1.5) {
            // Format TensorFlow NMS Corner Coordinates [y1, x1, y2, x2] (Row-Major Order)
            ymin = raw0 > 1.0 ? raw0 / inputConfig.height : raw0;
            xmin = raw1 > 1.0 ? raw1 / inputConfig.width : raw1;
            const ymax = raw2 > 1.0 ? raw2 / inputConfig.height : raw2;
            const xmax = raw3 > 1.0 ? raw3 / inputConfig.width : raw3;
            boxW = xmax - xmin;
            boxH = ymax - ymin;
          } else {
            // Format Center Coordinates [cx, cy, w, h]
            const normW = raw2 > 1.0 ? raw2 / inputConfig.width : raw2;
            const normH = raw3 > 1.0 ? raw3 / inputConfig.height : raw3;
            const normCx = raw0 > 1.0 ? raw0 / inputConfig.width : raw0;
            const normCy = raw1 > 1.0 ? raw1 / inputConfig.height : raw1;
            xmin = normCx - normW / 2;
            ymin = normCy - normH / 2;
            boxW = normW;
            boxH = normH;
          }

          if (boxW > 0.92 && boxH > 0.92 && score < 0.75) continue;

          maxScore = score;
          bestX = xmin;
          bestY = ymin;
          bestWidth = boxW;
          bestHeight = boxH;
        }
      }
    }
  } else {
    // Format [1, 300, 6]
    for (let i = 0; i < numCandidates; i++) {
      const baseIdx = i * numAttributes;

      // Cek apakah bentuknya End2End NMS [y1, x1, y2, x2, score, class_id]
      const isEnd2EndNms = numCandidates === 300 && numAttributes === 6;
      const score = isEnd2EndNms ? outputMatrix[baseIdx + 4]! : 0;

      if (isEnd2EndNms) {
        if (score > maxScore) {
          const raw0 = outputMatrix[baseIdx + 0]!;
          const raw1 = outputMatrix[baseIdx + 1]!;
          const raw2 = outputMatrix[baseIdx + 2]!;
          const raw3 = outputMatrix[baseIdx + 3]!;

          let xmin = 0, ymin = 0, boxW = 0, boxH = 0;

          if (raw2 > raw0 && raw3 > raw1) {
            // Format TensorFlow NMS Corner Coordinates [y1, x1, y2, x2] (Row-Major Order)
            ymin = raw0 > 1.0 ? raw0 / inputConfig.height : raw0;
            xmin = raw1 > 1.0 ? raw1 / inputConfig.width : raw1;
            const ymax = raw2 > 1.0 ? raw2 / inputConfig.height : raw2;
            const xmax = raw3 > 1.0 ? raw3 / inputConfig.width : raw3;
            boxW = xmax - xmin;
            boxH = ymax - ymin;
          } else {
            // Format Center Coordinates [cx, cy, w, h]
            const normW = raw2 > 1.0 ? raw2 / inputConfig.width : raw2;
            const normH = raw3 > 1.0 ? raw3 / inputConfig.height : raw3;
            const normCx = raw0 > 1.0 ? raw0 / inputConfig.width : raw0;
            const normCy = raw1 > 1.0 ? raw1 / inputConfig.height : raw1;
            xmin = normCx - normW / 2;
            ymin = normCy - normH / 2;
            boxW = normW;
            boxH = normH;
          }

          if (boxW > 0.92 && boxH > 0.92 && score < 0.75) continue;

          maxScore = score;
          bestX = xmin;
          bestY = ymin;
          bestWidth = boxW;
          bestHeight = boxH;
        }
      } else {
        // Standard Raw YOLO Multi-Class Loop
        for (let c = 4; c < numAttributes; c++) {
          const cScore = outputMatrix[baseIdx + c]!;
          if (cScore > maxScore) {
            const raw0 = outputMatrix[baseIdx + 0]!;
            const raw1 = outputMatrix[baseIdx + 1]!;
            const raw2 = outputMatrix[baseIdx + 2]!;
            const raw3 = outputMatrix[baseIdx + 3]!;

            const normW = raw2 > 1.0 ? raw2 / inputConfig.width : raw2;
            const normH = raw3 > 1.0 ? raw3 / inputConfig.height : raw3;
            const normCx = raw0 > 1.0 ? raw0 / inputConfig.width : raw0;
            const normCy = raw1 > 1.0 ? raw1 / inputConfig.height : raw1;

            const xmin = normCx - normW / 2;
            const ymin = normCy - normH / 2;

            if (normW > 0.92 && normH > 0.92 && cScore < 0.75) continue;

            maxScore = cScore;
            bestX = xmin;
            bestY = ymin;
            bestWidth = normW;
            bestHeight = normH;
          }
        }
      }
    }
  }

  if (maxScore >= confidenceThreshold) {
    const boxWidthPx = bestWidth * frameWidth;
    const boxHeightPx = bestHeight * frameHeight;
    const ratio = calculateBoundingBoxRatio(boxWidthPx, boxHeightPx, frameWidth, frameHeight);
    const severity = determineSeverityStatus(ratio);

    const normX = Math.max(0, Math.min(1, bestX));
    const normY = Math.max(0, Math.min(1, bestY));
    const validW = Math.max(0, Math.min(1 - normX, bestWidth));
    const validH = Math.max(0, Math.min(1 - normY, bestHeight));

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
