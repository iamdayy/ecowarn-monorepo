import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Alert, AppState, AppStateStatus } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useFrameProcessor, runAtTargetFps, Frame } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { NitroModules } from 'react-native-nitro-modules';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import * as Haptics from 'expo-haptics';
import { TrashVolumeStatus, ReportPayload, SpatialCoordinates, BoundingBox } from '../../types/ecowarn';
import { processYoloInference } from '../../utils/yoloPostProcessor';
import { useTrashDetectorModel } from '../../services/aiService';
import { ScannerHUDOverlay } from './ScannerHUDOverlay';
import { ScannerActionFooter } from './ScannerActionFooter';
import { UnauthorizedCameraView } from './UnauthorizedCameraView';

// Inference FPS disetel ke 5 (200ms) agar seimbang antara laju deteksi dan kehalusan preview 60 FPS
const TARGET_INFERENCE_FPS = 5;
// Threshold 0.45 untuk memblokir false-positive dari tekstur latar belakang
const CONFIDENCE_THRESHOLD = 0.45;

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
  isActive,
  torch = 'off',
  zoom = 1,
}: {
  device: React.ComponentProps<typeof Camera>['device'];
  frameProcessor: React.ComponentProps<typeof Camera>['frameProcessor'];
  isActive: boolean;
  torch?: 'on' | 'off';
  zoom?: number;
}) => (
  <Camera
    style={StyleSheet.absoluteFill}
    device={device}
    isActive={isActive}
    pixelFormat="yuv"
    frameProcessor={isActive ? frameProcessor : undefined}
    torch={isActive ? torch : 'off'}
    zoom={zoom}
    onError={(error) => {
      console.warn(`[Camera Lifecycle] Galat system kamera: ${error.code} - ${error.message}`);
    }}
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

  // Lifecycle & Navigation Focus Tracking (Mencegah kamera berjalan saat layar mati atau pindah halaman/tab)
  const isFocused = useIsFocused();
  const [isForeground, setIsForeground] = useState<boolean>(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      setIsForeground(nextAppState === 'active');
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const isCameraActive = isFocused && isForeground && hasPermission;

  // State kontrol baru (Torch, Zoom, Silent Haptic Mode)
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isHapticMuted, setIsHapticMuted] = useState<boolean>(false);
  const lastCriticalAlertTimeRef = useRef<number>(0);

  // Umpan balik getaran alarm haptic saat volume sampah berstatus KRITIS (kecuali mode sunyi aktif)
  useEffect(() => {
    if (detectedSeverity === 'Kritis' && !isHapticMuted) {
      const now = Date.now();
      // Throttling 2.5 detik agar getaran beruntun tidak mengganggu kenyamanan operator
      if (now - lastCriticalAlertTimeRef.current > 2500) {
        lastCriticalAlertTimeRef.current = now;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
  }, [detectedSeverity, isHapticMuted]);

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
  // STANDAR RESMI MARC ROUSAVY (VISION CAMERA V4 + FAST TFLITE):
  // 1. Wajib mengeksekusi secara SINKRON (runSync) di dalam Camera Worklet:
  //    - resize() memakai OpenGL ES context yang terikat pada thread kamera utama.
  //    - Hasil resize adalah ArrayBuffer yang dilarang melintasi batas memori
  //      antar-thread ("Array buffers are not supported as shared values").
  // 2. Wajib menggunakan .slice(byteOffset, byteOffset + byteLength) agar buffer
  //    memiliki aljika memori yang tepat saat masuk ke neural processing TFLite.
  // 3. Mengombinasikan pola resmi ini dengan Cache-Friendly Matrix Traversal!
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

          // 3. Eksekusi TFLite sinkronal resmi sesuai standar Marc Rousavy & NitroModules
          const outputs = tflite.runSync([inputBuffer as ArrayBuffer]);
          if (outputs && outputs.length > 0 && outputs[0] != null) {
            const outputMatrix = new Float32Array(outputs[0]);

            // 4. Eksekusi Post-Processing AI secara modular & bersih (Clean Code - SRP)
            const detection = processYoloInference(
              outputMatrix,
              inputConfig,
              outputConfig,
              frame.width,
              frame.height,
              CONFIDENCE_THRESHOLD
            );
            console.log('detection', detection)

            updateDetectionResult(detection.ratio, detection.severity, detection.boundingBox);
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
      <MemoizedCameraView
        device={device}
        frameProcessor={frameProcessor}
        isActive={isCameraActive}
        torch={isTorchOn ? 'on' : 'off'}
        zoom={zoomLevel}
      />
      <ScannerHUDOverlay
        severity={detectedSeverity}
        ratio={currentRatio}
        isModelLoaded={!!model}
        boundingBox={detectedBox}
        isTorchOn={isTorchOn}
        onToggleTorch={() => setIsTorchOn((prev) => !prev)}
        zoomLevel={zoomLevel}
        onCycleZoom={() => setZoomLevel((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 1))}
        isHapticMuted={isHapticMuted}
        onToggleHapticMute={() => setIsHapticMuted((prev) => !prev)}
      />
      <ScannerActionFooter
        severity={detectedSeverity}
        isReporting={isReporting}
        onSendReport={handleSendReport}
        currentLocation={currentLocation}
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
