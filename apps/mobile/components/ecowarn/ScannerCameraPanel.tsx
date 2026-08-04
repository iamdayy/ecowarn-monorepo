import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Alert, AppState, AppStateStatus, Image } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useFrameProcessor, runAtTargetFps, Frame } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { NitroModules } from 'react-native-nitro-modules';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { TrashVolumeStatus, ReportPayload, SpatialCoordinates, BoundingBox, AreaType } from '../../types/ecowarn';
import { processYoloInference, ObjectTrackerState } from '../../utils/yoloPostProcessor';
import { useTrashDetectorModel } from '../../services/aiService';
import { ScannerHUDOverlay } from './ScannerHUDOverlay';
import { ScannerActionFooter } from './ScannerActionFooter';
import { UnauthorizedCameraView } from './UnauthorizedCameraView';
import { ReportReviewModal } from './ReportReviewModal';

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
  cameraRef,
  device,
  frameProcessor,
  isActive,
  torch = 'off',
  zoom = 1,
}: {
  cameraRef?: React.RefObject<Camera | null>;
  device: React.ComponentProps<typeof Camera>['device'];
  frameProcessor: React.ComponentProps<typeof Camera>['frameProcessor'];
  isActive: boolean;
  torch?: 'on' | 'off';
  zoom?: number;
}) => (
  <Camera
    ref={cameraRef}
    style={StyleSheet.absoluteFill}
    device={device}
    isActive={isActive}
    photo={true}
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
  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [detectedSeverity, setDetectedSeverity] = useState<TrashVolumeStatus>('Ringan');
  const [currentRatio, setCurrentRatio] = useState<number>(0.0);
  const [detectedBox, setDetectedBox] = useState<BoundingBox | undefined>(undefined);
  const [isReporting, setIsReporting] = useState<boolean>(false);
  const { resize } = useResizePlugin();

  // Ref untuk melacak koordinat antar frame (Spatial Object Tracker)
  const trackerRef = useRef<ObjectTrackerState>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    score: 0,
    isValid: false,
    missedFrames: 0,
  });

  // State penguncian deteksi (Detection Lock & Frame Freeze)
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [frozenFrameUri, setFrozenFrameUri] = useState<string | null>(null);
  const isLockedRef = useRef<boolean>(false);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // Lifecycle & Navigation Focus Tracking
  const isFocused = useIsFocused();
  const [isForeground, setIsForeground] = useState<boolean>(AppState.currentState === 'active');

  // State dan ref untuk pemadaman kamera sementara (Freeze) & penetapan Jenis Area di modal konfirmasi
  const [isReviewModalVisible, setIsReviewModalVisible] = useState<boolean>(false);
  const [reviewPhotoUri, setReviewPhotoUri] = useState<string | null>(null);
  const [reviewPhotoBase64, setReviewPhotoBase64] = useState<string | undefined>(undefined);
  const [reviewGpsCoords, setReviewGpsCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const forceRescanRef = useRef<boolean>(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      setIsForeground(nextAppState === 'active');
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Saat modal konfirmasi aktif, siaran kamera dimatikan seketika (isActive = false) untuk menghemat GPU & baterai
  const isCameraActive = isFocused && isForeground && hasPermission && !isReviewModalVisible;

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
      if (isLockedRef.current) return; // Abaikan pembaruan frame jika status terkunci
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
      const executeInference = (isDeepRescan: boolean) => {
        let bufferLength = 0;
        try {
          if (boxedModel == null || !inputConfig.isValid || !outputConfig.isValid) return;
          const tflite = boxedModel.unbox();

          const resized = resize(frame, {
            scale: { width: inputConfig.width, height: inputConfig.height },
            pixelFormat: 'rgb',
            dataType: inputConfig.isFloat ? 'float32' : 'uint8',
          });

          const inputBuffer = resized.buffer.slice(
            resized.byteOffset,
            resized.byteOffset + resized.byteLength
          );
          bufferLength = inputBuffer.byteLength;

          const outputs = tflite.runSync([inputBuffer as ArrayBuffer]);
          if (outputs && outputs.length > 0 && outputs[0] != null) {
            const outputMatrix = new Float32Array(outputs[0]);

            // Pada tahap Deep Precision Rescan saat pemotretan, lewati bias memori tracker
            // agar model memurnikan prediksi kotak dan rasio langsung dari citra tajam frame jepretan!
            const activeTracker = isDeepRescan ? undefined : trackerRef.current;
            const detection = processYoloInference(
              outputMatrix,
              inputConfig,
              outputConfig,
              frame.width,
              frame.height,
              CONFIDENCE_THRESHOLD,
              activeTracker
            );

            updateDetectionResult(detection.ratio, detection.severity, detection.boundingBox);
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logWorkletError(`Gagal mengeksekusi TFLite: ${errMsg}`, bufferLength, inputConfig.expectedBytes);
        }
      };

      if (forceRescanRef.current) {
        forceRescanRef.current = false;
        executeInference(true);
      } else {
        runAtTargetFps(TARGET_INFERENCE_FPS, () => {
          executeInference(false);
        });
      }
    },
    [boxedModel, inputConfig, outputConfig, resize, updateDetectionResult, logWorkletError, trackerRef, forceRescanRef]
  );

  const handleToggleLock = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    if (nextLocked) {
      // Saat pengguna mengunci bounding box, rekam snapshot frame kamera agar
      // visual frame berhenti bergerak (terkunci sempurna menyatu dengan boks AI)
      if (cameraRef.current) {
        try {
          const snapshot = await cameraRef.current.takePhoto({
            flash: isTorchOn ? 'on' : 'off',
          });
          if (snapshot && snapshot.path) {
            const fileUri = snapshot.path.startsWith('file://') ? snapshot.path : `file://${snapshot.path}`;
            setFrozenFrameUri(fileUri);
          }
        } catch (error) {
          console.warn('[Camera Frame Lock] Gagal memotret frame beku saat penguncian:', error);
        }
      }
    } else {
      // Buka kunci mengembalikan kamera ke mode siaran waktu nyata (live stream)
      setFrozenFrameUri(null);
      if (trackerRef.current) trackerRef.current.isValid = false;
    }
  }, [isLocked, isTorchOn]);

  // Alur baru: Jepret -> Deep Rescan -> Freeze Kamera -> Tinjau & Pilih Area
  const handleSendReport = useCallback(async () => {
    try {
      setIsReporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 1. Picu Deep Precision Rescan di Worklet Thread sesaat sebelum jepretan
      forceRescanRef.current = true;

      // 2. Simultan GPS Re-Fetch secara paralel di background
      const gpsPromise = Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('GPS Refetch Timeout')), 4000)),
      ]).catch(() => null);

      // Beri jeda singkat agar Worklet mengeksekusi Deep Precision Rescan pada frame aktif
      await new Promise((resolve) => setTimeout(resolve, 120));

      // 3. Potret foto HD bukti lapangan
      let targetUri: string | null = frozenFrameUri;
      if (!targetUri && cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePhoto({
            flash: isTorchOn ? 'on' : 'off',
          });
          if (photo && photo.path) {
            targetUri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
            setFrozenFrameUri(targetUri);
            setIsLocked(true);
          }
        } catch (photoErr) {
          console.warn('[Camera Snapshot] Gagal memotret bukti lapangan:', photoErr);
        }
      }

      let photoUrl: string | undefined = undefined;
      if (targetUri) {
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            targetUri,
            [{ resize: { width: 900 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          if (manipulated.base64) {
            photoUrl = `data:image/jpeg;base64,${manipulated.base64}`;
          }
        } catch (manipError) {
          console.warn('[Camera Snapshot] Manipulator gagal, fallback ke pembacaan sistem berkas:', manipError);
          const base64Image = await FileSystem.readAsStringAsync(targetUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          photoUrl = `data:image/jpeg;base64,${base64Image}`;
        }
      }

      // 4. Tuntaskan penguncian koordinat aktual
      let finalLat = currentLocation.latitude;
      let finalLng = currentLocation.longitude;
      try {
        const freshPos = await gpsPromise;
        if (freshPos && typeof freshPos !== 'number') {
          finalLat = freshPos.coords.latitude;
          finalLng = freshPos.coords.longitude;
          console.log(`[Scanner GPS Re-Fetch] Sukses mengunci koordinat aktual: ${finalLat}, ${finalLng}`);
        }
      } catch (err) {
        console.warn('[Warning Scanner GPS] Gagal merebut posisi terbaru:', err);
      }

      // 5. Padamkan siaran kamera waktu nyata & buka modal tinjauan / penentuan area
      setReviewPhotoUri(targetUri);
      setReviewPhotoBase64(photoUrl);
      setReviewGpsCoords({ latitude: finalLat, longitude: finalLng });
      setIsReviewModalVisible(true);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Capture] Gagal memproses jepretan & scan ulang: ${errorMessage}`);
      Alert.alert('Galat', 'Gagal memproses pemotretan bukti lapangan.');
    } finally {
      setIsReporting(false);
    }
  }, [currentLocation, isTorchOn, frozenFrameUri]);

  const handleConfirmReport = useCallback(async (selectedArea: AreaType) => {
    try {
      setIsSubmittingReport(true);
      const payload: ReportPayload = {
        latitude: reviewGpsCoords.latitude,
        longitude: reviewGpsCoords.longitude,
        severity: detectedSeverity,
        areaType: selectedArea,
        photoUrl: reviewPhotoBase64,
      };

      await onSendReport(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Tuntaskan modal & hidupkan kembali siaran waktu nyata kamera
      setIsReviewModalVisible(false);
      setReviewPhotoUri(null);
      setReviewPhotoBase64(undefined);
      setIsLocked(false);
      setFrozenFrameUri(null);
      if (trackerRef.current) trackerRef.current.isValid = false;
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Confirm Report] Gagal mengirim laporan dari modal: ${errorMessage}`);
      Alert.alert('Galat', 'Gagal memproses kirim laporan peringatan dini ke peladen.');
    } finally {
      setIsSubmittingReport(false);
    }
  }, [reviewGpsCoords, detectedSeverity, reviewPhotoBase64, onSendReport]);

  const handleRetakePhoto = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsReviewModalVisible(false);
    setReviewPhotoUri(null);
    setReviewPhotoBase64(undefined);
    setIsLocked(false);
    setFrozenFrameUri(null);
    if (trackerRef.current) trackerRef.current.isValid = false;
  }, []);

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
      <View style={styles.cameraWrapper}>
        <MemoizedCameraView
          cameraRef={cameraRef}
          device={device}
          frameProcessor={frameProcessor}
          isActive={isCameraActive}
          torch={isTorchOn ? 'on' : 'off'}
          zoom={zoomLevel}
        />
        {/* === Frame Beku (Frozen Snapshot) Saat Penguncian Bounding Box Aktif === */}
        {isLocked && frozenFrameUri && (
          <Image
            source={{ uri: frozenFrameUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        )}
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
          isLocked={isLocked}
          onToggleLock={handleToggleLock}
        />
      </View>
      <ScannerActionFooter
        severity={detectedSeverity}
        isReporting={isReporting}
        onSendReport={handleSendReport}
        currentLocation={currentLocation}
      />
      <ReportReviewModal
        visible={isReviewModalVisible}
        imageUri={reviewPhotoUri}
        detectedRatio={currentRatio}
        initialSeverity={detectedSeverity}
        isSubmitting={isSubmittingReport}
        onConfirm={handleConfirmReport}
        onRetake={handleRetakePhoto}
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
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
});

