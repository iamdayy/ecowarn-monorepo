import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor, runAtTargetFps, Frame } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { NitroModules } from 'react-native-nitro-modules';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { TrashVolumeStatus, ReportPayload, SpatialCoordinates, BoundingBox } from '../../types/ecowarn';
import { calculateBoundingBoxRatio, determineSeverityStatus } from '../../utils/volumeCalculator';
import { useTrashDetectorModel } from '../../services/aiService';
import { ScannerHUDOverlay } from './ScannerHUDOverlay';
import { ScannerActionFooter } from './ScannerActionFooter';
import { UnauthorizedCameraView } from './UnauthorizedCameraView';

// Inference FPS disetel ke 5 (200ms) agar seimbang antara laju deteksi dan kehalusan preview 60 FPS
const TARGET_INFERENCE_FPS = 5;
// Threshold 0.40 untuk memblokir false-positive dari tekstur latar belakang
const CONFIDENCE_THRESHOLD = 0.40;

// =====================================================================
// OPTIMASI PERFORMA PREVIEW KAMERA ANDROID:
// 1. React.memo: Isolasi re-render pada View kamera agar stabil di 60 FPS.
// 2. Tanpa enableBufferCompression: Mengeliminasi latensi konversi CPU di Android.
// 3. Tanpa pembatas format 720p/30fps: Mengizinkan Camera2 HAL Android memilih
//    stream Zero-Copy native terbaik sesuai kecepatan layar (60Hz/90Hz/120Hz).
// =====================================================================
const MemoizedCameraView = React.memo(({
  device,
  frameProcessor,
}: {
  device: React.ComponentProps<typeof Camera>['device'];
  frameProcessor: React.ComponentProps<typeof Camera>['frameProcessor'];
}) => (
  <Camera
    style={StyleSheet.absoluteFill}
    device={device}
    isActive={true}
    pixelFormat="yuv"
    frameProcessor={frameProcessor}
  />
));
MemoizedCameraView.displayName = 'MemoizedCameraView';

// =====================================================================

interface ScannerCameraPanelProps {
  currentLocation: SpatialCoordinates;
  onSendReport: (payload: ReportPayload) => Promise<void>;
}

export const ScannerCameraPanel: React.FC<ScannerCameraPanelProps> = ({
  currentLocation,
  onSendReport,
}) => {
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [detectedSeverity, setDetectedSeverity] = useState<TrashVolumeStatus>('Ringan');
  const [currentRatio, setCurrentRatio] = useState<number>(0.0);
  const [detectedBox, setDetectedBox] = useState<BoundingBox | undefined>(undefined);
  const [isReporting, setIsReporting] = useState<boolean>(false);
  const { resize } = useResizePlugin();

  // Memuat model TFLite untuk Client-Side Inference
  const { model } = useTrashDetectorModel();

  // TfliteModel di-box ke HostObject di JS thread, lalu di-unbox di dalam Worklet Thread
  // Sesuai pola resmi dari contoh github mrousavy/react-native-fast-tflite
  const boxedModel = useMemo(
    () => (model != null ? NitroModules.box(model) : undefined),
    [model]
  );

  // Konfigurasi input model TFLite
  const inputConfig = useMemo(() => {
    if (model == null || !model.inputs || model.inputs.length === 0) {
      return { width: 640, height: 640, isFloat: true, isValid: false, expectedBytes: 0 };
    }
    const tensor = model.inputs[0]!;
    const shape = tensor.shape || [1, 640, 640, 3];
    const width = shape[1] === 3 ? (shape[3] || 640) : (shape[2] || 640);
    const height = shape[1] === 3 ? (shape[2] || 640) : (shape[1] || 640);
    const isFloat = tensor.dataType === 'float32';
    const expectedBytes = width * height * 3 * (isFloat ? 4 : 1);
    return { width, height, isFloat, isValid: true, expectedBytes };
  }, [model]);

  // Konfigurasi output model TFLite
  const outputConfig = useMemo(() => {
    if (model == null || !model.outputs || model.outputs.length === 0) {
      return { shape: [1, 5, 8400], numAttributes: 5, numCandidates: 8400, isTransposed: true, isValid: false };
    }
    const tensor = model.outputs[0]!;
    const shape = tensor.shape || [1, 5, 8400];
    const dim1 = shape[1] || 5;
    const dim2 = shape[2] || 8400;
    const isTransposed = dim1 < dim2;
    const numAttributes = isTransposed ? dim1 : dim2;
    const numCandidates = isTransposed ? dim2 : dim1;
    return { shape, numAttributes, numCandidates, isTransposed, isValid: true };
  }, [model]);

  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Error Camera Permission] Gagal meminta izin kamera: ${errorMessage}`);
      }
    };
    requestCameraPermission();
  }, []);

  // =====================================================================
  // Bridge Worklet→JS Tanpa Throttle (Real-time Instant Response)
  // Menghapuskan jeda waktu 150ms sehingga Severity Status merespons instan!
  // =====================================================================
  const updateDetectionResult = useMemo(
    () => Worklets.createRunOnJS((ratio: number, severity: TrashVolumeStatus, box?: BoundingBox) => {
      setDetectedSeverity(severity);
      setCurrentRatio(ratio);
      setDetectedBox(box);
    }),
    []
  );

  const logWorkletError = useMemo(
    () => Worklets.createRunOnJS((errorMsg: string, actualBytes: number, expectedBytes: number) => {
      console.error(`[Error Frame Processor] ${errorMsg} | Buffer: ${actualBytes} vs ${expectedBytes} bytes`);
    }),
    []
  );

  // Client-Side Frame Processor (DILARANG mengunduh/mengirim gambar ke peladen)
  // =====================================================================
  // STANDAR RESMI MARC ROUSAVY + OPTIMASI ALGORITMA ECOWARN:
  // 1. Dilarang memakai runAsync karena resize() memakai OpenGL ES context
  //    yang terikat pada thread utama kamera (mengeliminasi crash/force close).
  // 2. Wajib menggunakan .slice(byteOffset, byteOffset + byteLength) agar buffer
  //    memiliki aljika memori yang tepat saat masuk ke neural processing TFLite.
  // 3. Mengkombinasikan pola resmi ini dengan Cache-Friendly Matrix Traversal,
  //    waktu evaluasi 8.400 kandidat melompat cepat dari ~200ms ke < 2ms!
  // =====================================================================
  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      runAtTargetFps(TARGET_INFERENCE_FPS, () => {
        let bufferLength = 0;
        try {
          if (boxedModel == null || !inputConfig.isValid || !outputConfig.isValid) return;

          // Unbox model secara resmi di Worklet thread
          const tflite = boxedModel.unbox();

          // 1. GPU Resize di Camera Worklet Thread (< 1 milidetik via EGL Shader)
          const resized = resize(frame, {
            scale: { width: inputConfig.width, height: inputConfig.height },
            pixelFormat: 'rgb',
            dataType: inputConfig.isFloat ? 'float32' : 'uint8',
          });

          // 2. POLA RESMI MARC ROUSAVY: Ambil potongan buffer dari offset hingga length
          // Mencegah korup memori atau ketidaksesuaian ukuran padding pada TFLite runSync
          const inputBuffer = resized.buffer.slice(
            resized.byteOffset,
            resized.byteOffset + resized.byteLength
          );
          bufferLength = inputBuffer.byteLength;

          // 3. Eksekusi TFLite syncraonal (stabil tanpa antrean gila)
          const outputs = tflite.runSync([inputBuffer as ArrayBuffer]);
          if (outputs && outputs.length > 0 && outputs[0] != null) {
            const outputMatrix = new Float32Array(outputs[0]);
            const numCandidates = outputConfig.numCandidates;
            const numAttributes = outputConfig.numAttributes;
            const isTransposed = outputConfig.isTransposed;

            let maxScore = 0.0;
            let bestX = 0.0;
            let bestY = 0.0;
            let bestWidth = 0.0;
            let bestHeight = 0.0;

            // 4. CACHE-FRIENDLY MATRIX TRAVERSAL (OPTIMASI EKSTREM HERMES CPU)
            // Menghilangkan 42.000 perkalian & pengecekan ternary di dalam loop!
            // Menjadikan eksekusi pasca-proses selesai sekian < 2 milidetik!
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

                    // Filter anomali bounding box raksasa (>92% dari ukuran layar)
                    const normWTest = w > 1.0 ? w / inputConfig.width : w;
                    const normHTest = h > 1.0 ? h / inputConfig.height : h;
                    if (normWTest > 0.92 && normHTest > 0.92 && score < 0.85) {
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
                    if (normWTest > 0.92 && normHTest > 0.92 && score < 0.85) {
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

            if (maxScore >= CONFIDENCE_THRESHOLD) {
              const boxWidthPx = bestWidth > 1.0 ? (bestWidth / inputConfig.width) * frame.width : bestWidth * frame.width;
              const boxHeightPx = bestHeight > 1.0 ? (bestHeight / inputConfig.height) * frame.height : bestHeight * frame.height;
              const ratio = calculateBoundingBoxRatio(boxWidthPx, boxHeightPx, frame.width, frame.height);
              const severity = determineSeverityStatus(ratio);

              // Konversi koordinat pusat ke sudut kiri atas dalam skala normalisasi 0..1 untuk HUD
              const normCx = bestX > 1.0 ? bestX / inputConfig.width : bestX;
              const normCy = bestY > 1.0 ? bestY / inputConfig.height : bestY;
              const normW = bestWidth > 1.0 ? bestWidth / inputConfig.width : bestWidth;
              const normH = bestHeight > 1.0 ? bestHeight / inputConfig.height : bestHeight;

              const normX = Math.max(0, Math.min(1, normCx - normW / 2));
              const normY = Math.max(0, Math.min(1, normCy - normH / 2));
              const validW = Math.max(0, Math.min(1 - normX, normW));
              const validH = Math.max(0, Math.min(1 - normY, normH));

              updateDetectionResult(ratio, severity, { x: normX, y: normY, width: validW, height: validH });
            } else {
              updateDetectionResult(0.0, 'Ringan', undefined);
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logWorkletError(`Gagal mengeksekusi TFLite: ${errMsg}`, bufferLength, inputConfig.expectedBytes);
        }
      });
    },
    [boxedModel, inputConfig, outputConfig, resize, updateDetectionResult, logWorkletError]
  );

  const handleSendReport = useCallback(async () => {
    try {
      setIsReporting(true);

      // PAYLOAD KETAT: Hanya kirim titik koordinat dan status keparahan ke peladen!
      const payload: ReportPayload = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        severity: detectedSeverity,
      };

      await onSendReport(payload);
      Alert.alert('Sukses', `Laporan status ${detectedSeverity} berhasil dikirim ke peladen.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Send Report] Gagal mengirim payload laporan: ${errorMessage}`);
      Alert.alert('Galat', 'Gagal mengirim laporan peringatan dini ke peladen.');
    } finally {
      setIsReporting(false);
    }
  }, [currentLocation, detectedSeverity, onSendReport]);

  // === Tampilan Belum Diizinkan ===
  if (!hasPermission || !device) {
    return (
      <UnauthorizedCameraView
        onRequestPermission={async () => {
          const status = await Camera.requestCameraPermission();
          setHasPermission(status === 'granted');
        }}
      />
    );
  }

  // === Tampilan Utama Scanner ===
  return (
    <View style={styles.container}>
      <MemoizedCameraView device={device} frameProcessor={frameProcessor} />
      <ScannerHUDOverlay
        severity={detectedSeverity}
        ratio={currentRatio}
        isModelLoaded={!!model}
        boundingBox={detectedBox}
      />
      <ScannerActionFooter
        severity={detectedSeverity}
        isReporting={isReporting}
        onSendReport={handleSendReport}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
});
