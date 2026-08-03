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

// State pelacakan antar-frame (Object Tracker) untuk menjaga kontinuitas dan anti-loncat
export interface ObjectTrackerState {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  isValid: boolean;
  missedFrames: number;
}

/**
 * Menghitung nilai Intersection over Union (IoU) antara dua bounding box normalisasi.
 */
const calculateIoU = (
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): number => {
  'worklet';
  const left = Math.max(x1, x2);
  const top = Math.max(y1, y2);
  const right = Math.min(x1 + w1, x2 + w2);
  const bottom = Math.min(y1 + h1, y2 + h2);

  if (right <= left || bottom <= top) return 0.0;
  
  const intersection = (right - left) * (bottom - top);
  const area1 = w1 * h1;
  const area2 = w2 * h2;
  const union = area1 + area2 - intersection;
  
  return union > 0 ? intersection / union : 0.0;
};

/**
 * Menghitung jarak Euclid antar titik pusat (centroid) dua bounding box.
 */
const calculateCenterDistance = (
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): number => {
  'worklet';
  const cx1 = x1 + w1 / 2;
  const cy1 = y1 + h1 / 2;
  const cx2 = x2 + w2 / 2;
  const cy2 = y2 + h2 / 2;
  return Math.hypot(cx1 - cx2, cy1 - cy2);
};

/**
 * Pemroses pasca-indera AI (Post-Processor) untuk hasil deteksi model TFLite YOLO.
 * Dilengkapi dengan Spatial Object Tracker & Temporal Smoothing (EMA) agar bounding box
 * mengikat kuat pada objek yang sama dan tidak melamun/loncat ke titik lain.
 */
export const processYoloInference = (
  outputMatrix: Float32Array,
  inputConfig: YoloInputConfig,
  outputConfig: YoloOutputConfig,
  frameWidth: number,
  frameHeight: number,
  confidenceThreshold: number,
  tracker?: ObjectTrackerState
): YoloDetectionResult => {
  'worklet';
  const numCandidates = outputConfig.numCandidates;
  const numAttributes = outputConfig.numAttributes;
  const isTransposed = outputConfig.isTransposed;

  let maxFitness = -1.0;
  let bestScore = 0.0;
  let bestX = 0.0;
  let bestY = 0.0;
  let bestWidth = 0.0;
  let bestHeight = 0.0;

  // Jika objek sedang aktif dilacak, izinkan batas toleransi skor sedikit lebih rendah (0.35)
  // guna mengatasi blur gerak sesaat saat operator memutar/menggerakkan kamera HP
  const isTrackerActive = tracker != null && tracker.isValid && tracker.missedFrames <= 2;
  const activeThreshold = isTrackerActive ? Math.min(confidenceThreshold, 0.35) : confidenceThreshold;

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
        if (score >= activeThreshold) {
          const raw0 = outputMatrix[offsetX + i]!;
          const raw1 = outputMatrix[offsetY + i]!;
          const raw2 = outputMatrix[offsetW + i]!;
          const raw3 = outputMatrix[offsetH + i]!;

          let xmin = 0, ymin = 0, boxW = 0, boxH = 0;

          // Deteksi Format: End2End NMS TF [y1, x1, y2, x2] vs Raw YOLO [cx, cy, w, h]
          if (raw2 > raw0 && raw3 > raw1 && raw2 <= inputConfig.width * 1.5) {
            ymin = raw0 > 1.0 ? raw0 / inputConfig.height : raw0;
            xmin = raw1 > 1.0 ? raw1 / inputConfig.width : raw1;
            const ymax = raw2 > 1.0 ? raw2 / inputConfig.height : raw2;
            const xmax = raw3 > 1.0 ? raw3 / inputConfig.width : raw3;
            boxW = xmax - xmin;
            boxH = ymax - ymin;
          } else {
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

          // =====================================================================
          // TRACKING FITNESS METRIC:
          // Kombinasikan skor kepercayaan AI dengan kedekatan spasial (IoU + Jarak Pusat).
          // Mencegah detektor meloncat ke sampah atau gangguan latar lain ketika 
          // objek sasaran sudah terkunci dengan baik (Target Stickiness).
          // =====================================================================
          let fitness = score;
          if (isTrackerActive && tracker) {
            const iou = calculateIoU(xmin, ymin, boxW, boxH, tracker.x, tracker.y, tracker.width, tracker.height);
            const dist = calculateCenterDistance(xmin, ymin, boxW, boxH, tracker.x, tracker.y, tracker.width, tracker.height);
            if (iou > 0.1 || dist < 0.3) {
              const trackingBonus = (iou * 0.45) + (Math.max(0, 1.0 - dist * 3.0) * 0.25);
              fitness = score + trackingBonus;
            }
          }

          if (fitness > maxFitness) {
            maxFitness = fitness;
            bestScore = score;
            bestX = xmin;
            bestY = ymin;
            bestWidth = boxW;
            bestHeight = boxH;
          }
        }
      }
    }
  } else {
    // Format [1, 300, 6] atau Standard Raw YOLO
    for (let i = 0; i < numCandidates; i++) {
      const baseIdx = i * numAttributes;
      const isEnd2EndNms = numCandidates === 300 && numAttributes === 6;
      const score = isEnd2EndNms ? outputMatrix[baseIdx + 4]! : 0;

      if (isEnd2EndNms) {
        if (score >= activeThreshold) {
          const raw0 = outputMatrix[baseIdx + 0]!;
          const raw1 = outputMatrix[baseIdx + 1]!;
          const raw2 = outputMatrix[baseIdx + 2]!;
          const raw3 = outputMatrix[baseIdx + 3]!;

          let xmin = 0, ymin = 0, boxW = 0, boxH = 0;

          if (raw2 > raw0 && raw3 > raw1) {
            ymin = raw0 > 1.0 ? raw0 / inputConfig.height : raw0;
            xmin = raw1 > 1.0 ? raw1 / inputConfig.width : raw1;
            const ymax = raw2 > 1.0 ? raw2 / inputConfig.height : raw2;
            const xmax = raw3 > 1.0 ? raw3 / inputConfig.width : raw3;
            boxW = xmax - xmin;
            boxH = ymax - ymin;
          } else {
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

          let fitness = score;
          if (isTrackerActive && tracker) {
            const iou = calculateIoU(xmin, ymin, boxW, boxH, tracker.x, tracker.y, tracker.width, tracker.height);
            const dist = calculateCenterDistance(xmin, ymin, boxW, boxH, tracker.x, tracker.y, tracker.width, tracker.height);
            if (iou > 0.1 || dist < 0.3) {
              const trackingBonus = (iou * 0.45) + (Math.max(0, 1.0 - dist * 3.0) * 0.25);
              fitness = score + trackingBonus;
            }
          }

          if (fitness > maxFitness) {
            maxFitness = fitness;
            bestScore = score;
            bestX = xmin;
            bestY = ymin;
            bestWidth = boxW;
            bestHeight = boxH;
          }
        }
      } else {
        // Standard Raw YOLO Multi-Class Loop
        for (let c = 4; c < numAttributes; c++) {
          const cScore = outputMatrix[baseIdx + c]!;
          if (cScore >= activeThreshold) {
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

            let fitness = cScore;
            if (isTrackerActive && tracker) {
              const iou = calculateIoU(xmin, ymin, normW, normH, tracker.x, tracker.y, tracker.width, tracker.height);
              const dist = calculateCenterDistance(xmin, ymin, normW, normH, tracker.x, tracker.y, tracker.width, tracker.height);
              if (iou > 0.1 || dist < 0.3) {
                const trackingBonus = (iou * 0.45) + (Math.max(0, 1.0 - dist * 3.0) * 0.25);
                fitness = cScore + trackingBonus;
              }
            }

            if (fitness > maxFitness) {
              maxFitness = fitness;
              bestScore = cScore;
              bestX = xmin;
              bestY = ymin;
              bestWidth = normW;
              bestHeight = normH;
            }
          }
        }
      }
    }
  }

  // Jika berhasil menemukan kandidat yang layak:
  if (bestScore >= activeThreshold && maxFitness > 0) {
    let normX = Math.max(0, Math.min(1, bestX));
    let normY = Math.max(0, Math.min(1, bestY));
    let validW = Math.max(0, Math.min(1 - normX, bestWidth));
    let validH = Math.max(0, Math.min(1 - normY, bestHeight));

    // =====================================================================
    // EXPONENTIAL MOVING AVERAGE (EMA) FILTERING:
    // Redam fluktuasi saraf YOLO langsung pada Worklet Thread.
    // Membantu bounding box tidak bergetar (shiver) saat kamera tegak atau melambat.
    // =====================================================================
    if (isTrackerActive && tracker) {
      const dist = calculateCenterDistance(normX, normY, validW, validH, tracker.x, tracker.y, tracker.width, tracker.height);
      if (dist < 0.35) {
        // 45% observasi baru + 55% memori tracker (menciptakan pergerakan yang mulus & solid)
        const alpha = 0.45;
        normX = tracker.x * (1 - alpha) + normX * alpha;
        normY = tracker.y * (1 - alpha) + normY * alpha;
        validW = tracker.width * (1 - alpha) + validW * alpha;
        validH = tracker.height * (1 - alpha) + validH * alpha;
      }
    }

    if (tracker) {
      tracker.x = normX;
      tracker.y = normY;
      tracker.width = validW;
      tracker.height = validH;
      tracker.score = bestScore;
      tracker.isValid = true;
      tracker.missedFrames = 0;
    }

    const boxWidthPx = validW * frameWidth;
    const boxHeightPx = validH * frameHeight;
    const ratio = calculateBoundingBoxRatio(boxWidthPx, boxHeightPx, frameWidth, frameHeight);
    const severity = determineSeverityStatus(ratio);

    return {
      hasDetection: true,
      ratio,
      severity,
      boundingBox: { x: normX, y: normY, width: validW, height: validH },
    };
  }

  // =====================================================================
  // DROPOUT HYSTERESIS / PROTECTION:
  // Jika inferensi saat ini meleset sekilas akibat getaran tangan / blur pergerakan,
  // tahan posisi tracker hingga 2 frame (~400ms) agar antarmuka tidak berkedip mati-muncul.
  // =====================================================================
  if (tracker && tracker.isValid && tracker.missedFrames < 2) {
    tracker.missedFrames += 1;
    const boxWidthPx = tracker.width * frameWidth;
    const boxHeightPx = tracker.height * frameHeight;
    const ratio = calculateBoundingBoxRatio(boxWidthPx, boxHeightPx, frameWidth, frameHeight);
    const severity = determineSeverityStatus(ratio);

    return {
      hasDetection: true,
      ratio,
      severity,
      boundingBox: { x: tracker.x, y: tracker.y, width: tracker.width, height: tracker.height },
    };
  }

  if (tracker) {
    tracker.isValid = false;
    tracker.missedFrames = 0;
  }

  return {
    hasDetection: false,
    ratio: 0.0,
    severity: 'Ringan',
    boundingBox: undefined,
  };
};
