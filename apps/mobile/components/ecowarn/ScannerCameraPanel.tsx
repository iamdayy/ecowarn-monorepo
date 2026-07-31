import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor, runAtTargetFps, Frame } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-worklets';
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

  // Memuat model TFLite untuk Client-Side Inference
  const { model } = useTrashDetectorModel();

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

  // Client-Side Frame Processor (DILARANG mengunduh/mengirim gambar ke peladen)
  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      runAtTargetFps(TARGET_INFERENCE_FPS, () => {
        try {
          if (model == null) return;

          // Mengeksekusi inference langsung menggunakan objek Frame bawaan Vision Camera
          const outputs = model.runSync([frame as unknown as Uint8Array]);
          const detectionBoxes = outputs[0] as unknown as number[]; // [ymin, xmin, ymax, xmax]
          const detectionScores = outputs[2] as unknown as number[];

          if (detectionScores && detectionScores[0] > 0.5) {
            const boxWidth = (detectionBoxes[3] - detectionBoxes[1]) * frame.width;
            const boxHeight = (detectionBoxes[2] - detectionBoxes[0]) * frame.height;

            // Kalkulasi perbandingan luas (Bounding Box Ratio) secara real-time
            const ratio = calculateBoundingBoxRatio(boxWidth, boxHeight, frame.width, frame.height);
            const severity = determineSeverityStatus(ratio);

            runOnJS(setCurrentRatio)(ratio);
            runOnJS(setDetectedSeverity)(severity);
          }
        } catch (error) {
          console.error('[Error Frame Processor] Gagal mengeksekusi TFLite di sisi klien', error);
        }
      });
    },
    [model]
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
        <Text style={styles.unauthorizedText}>Izin kamera diperlukan atau kamera tidak terdeteksi.</Text>
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
