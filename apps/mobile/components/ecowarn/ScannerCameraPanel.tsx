import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor, runAtTargetFps, Frame } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { NitroModules } from 'react-native-nitro-modules';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { TrashVolumeStatus, ReportPayload, SpatialCoordinates } from '../../types/ecowarn';
import { calculateBoundingBoxRatio, determineSeverityStatus } from '../../utils/volumeCalculator';
import { useTrashDetectorModel } from '../../services/aiService';
import { SeverityStatusBadge } from './SeverityStatusBadge';

const TARGET_INFERENCE_FPS = 30; // Memastikan pemrosesan berkecepatan tinggi min 30 FPS

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
  const [isReporting, setIsReporting] = useState<boolean>(false);
  const { resize } = useResizePlugin();

  // Memuat model TFLite untuk Client-Side Inference
  const { model } = useTrashDetectorModel();

  // TfliteModel adalah Nitro HybridObject (jsi::NativeState). Runtime Worklet VisionCamera v4
  // tidak dapat mengakses NativeState secara langsung saat menyeberang thread, sehingga harus di-box
  // menjadi jsi::HostObject dengan NitroModules.box di JS thread, lalu di-unbox di dalam worklet.
  const boxedModel = useMemo(
    () => (model != null ? NitroModules.box(model) : undefined),
    [model]
  );

  // Deteksi konfigurasi input model di JS Thread agar tidak berulang kali mengakses atribut HybridObject di dalam Worklet
  const inputConfig = useMemo(() => {
    if (model == null || !model.inputs || model.inputs.length === 0) {
      return { width: 640, height: 640, isFloat: true, isValid: false, expectedBytes: 0 };
    }
    const tensor = model.inputs[0]!;
    const shape = tensor.shape || [1, 640, 640, 3];
    // Menangani format NCHW [1, 3, 640, 640] (Channels First) ataupun NHWC [1, 640, 640, 3]
    const width = shape[1] === 3 ? (shape[3] || 640) : (shape[2] || 640);
    const height = shape[1] === 3 ? (shape[2] || 640) : (shape[1] || 640);
    const isFloat = tensor.dataType === 'float32';
    const expectedBytes = width * height * 3 * (isFloat ? 4 : 1);
    console.log('[Model Input Config]', JSON.stringify({ shape, width, height, dataType: tensor.dataType, expectedBytes }));
    return { width, height, isFloat, isValid: true, expectedBytes };
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

  // Membuat jembatan eksekusi JS yang aman tanpa konflik thread dari dalam Worklet
  const updateDetectionResult = Worklets.createRunOnJS((ratio: number, severity: TrashVolumeStatus) => {
    setCurrentRatio(ratio);
    setDetectedSeverity(severity);
  });

  // Bridge log ke JS thread untuk menghindari galat NamelessError/Reflect.construct saat Babel mencetak eksepsi native
  const logWorkletError = Worklets.createRunOnJS((errorMsg: string, actualBytes: number, expectedBytes: number) => {
    console.error(`[Error Frame Processor] ${errorMsg} | Buffer TFLite: ${actualBytes} bytes (Diterima) vs ${expectedBytes} bytes (Dibutuhkan Model)`);
  });

  // Client-Side Frame Processor (DILARANG mengunduh/mengirim gambar ke peladen)
  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      runAtTargetFps(TARGET_INFERENCE_FPS, () => {
        let bufferLength = 0;
        try {
          if (boxedModel == null || !inputConfig.isValid) return;

          const tflite = boxedModel.unbox();

          // 1. Ubah format YUV Frame resolusi kamera ke format RGB berdimensi sesuai input model (640x640)
          const resized = resize(frame, {
            scale: {
              width: inputConfig.width,
              height: inputConfig.height,
            },
            pixelFormat: 'rgb',
            dataType: inputConfig.isFloat ? 'float32' : 'uint8',
          });

          // 2. Ambil slice murni dari ArrayBuffer biner
          const inputBuffer = resized.buffer.slice(
            resized.byteOffset,
            resized.byteOffset + resized.byteLength
          );
          bufferLength = inputBuffer.byteLength;

          // 3. Eksekusi inference sinkronous dengan inputBuffer yang sah
          const outputs = tflite.runSync([inputBuffer as ArrayBuffer]);
          if (outputs && outputs.length > 0 && outputs[0] != null) {
            const outputMatrix = new Float32Array(outputs[0]);
            // Output tensor YOLOv26 memiliki bentuk [1, 5, 8400] -> 5 baris (x, y, w, h, score), 8400 kolom (kandidat)
            const numCandidates = 8400;
            let maxScore = 0.0;
            let bestWidth = 0.0;
            let bestHeight = 0.0;

            // Cari detection box dengan skor keyakinan tertinggi di antara 8400 kandidat
            for (let i = 0; i < numCandidates; i++) {
              const score = outputMatrix[4 * numCandidates + i]!;
              if (score > maxScore) {
                maxScore = score;
                bestWidth = outputMatrix[2 * numCandidates + i]!;
                bestHeight = outputMatrix[3 * numCandidates + i]!;
              }
            }

            // Jika keyakinan deteksi tumpukan sampah melebihi threshold 40% (0.4)
            if (maxScore > 0.4) {
              // Standarisasi dimensi box apakah dalam bentuk piksel (0..640) atau normalisasi (0..1)
              const boxWidthPx = bestWidth > 1.0 ? (bestWidth / inputConfig.width) * frame.width : bestWidth * frame.width;
              const boxHeightPx = bestHeight > 1.0 ? (bestHeight / inputConfig.height) * frame.height : bestHeight * frame.height;

              // Kalkulasi perbandingan luas (Bounding Box Ratio) secara real-time
              const ratio = calculateBoundingBoxRatio(boxWidthPx, boxHeightPx, frame.width, frame.height);
              const severity = determineSeverityStatus(ratio);

              updateDetectionResult(ratio, severity);
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logWorkletError(`Gagal mengeksekusi TFLite: ${errMsg}`, bufferLength, inputConfig.expectedBytes);
        }
      });
    },
    [boxedModel, inputConfig, resize, updateDetectionResult, logWorkletError]
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

  if (!hasPermission || !device) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Text style={styles.unauthorizedText}>Izin akses kamera diperlukan untuk pemantauan EcoWarn.</Text>
        <TouchableOpacity
          style={[styles.reportButton, { marginTop: 16, width: 200 }]}
          onPress={async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
          }}>
          <Text style={styles.reportButtonText}>Beri Izin Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />

      <View style={styles.overlayHeader}>
        <SeverityStatusBadge severity={detectedSeverity} ratio={currentRatio} />
      </View>

      <View style={styles.overlayFooter}>
        <TouchableOpacity
          style={[styles.reportButton, isReporting && styles.reportButtonDisabled]}
          onPress={handleSendReport}
          disabled={isReporting}>
          <Text style={styles.reportButtonText}>
            {isReporting ? 'Mengirim Data...' : `Kirim Peringatan (${detectedSeverity})`}
          </Text>
        </TouchableOpacity>
        <Text style={styles.privacyNote}>
          🔒 Client-Side AI Inference: Gambar diproses lokal, hanya koordinat & status yang dikirim.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  unauthorizedText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  overlayHeader: {
    position: 'absolute',
    top: 50,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayFooter: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  reportButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  reportButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  privacyNote: {
    color: '#E5E5EA',
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
});
