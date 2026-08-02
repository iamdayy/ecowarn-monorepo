import { useTensorflowModel } from 'react-native-fast-tflite';

const MODEL_FILE_NAME = 'ecowarn_trash_detector';

export const useTrashDetectorModel = () => {
  try {
    // Memuat model object detection dengan akselerasi GPU Android (Client-Side Inference)
    // Akselerasi GPU memangkas waktu komputasi di bawah 10ms agar video preview 60 FPS bebas stutter!
    const plugin = useTensorflowModel(require('../assets/ecowarn_trash_detector.tflite'), ['android-gpu']);
    return plugin;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error AI Service] Gagal memuat model TFLite (${MODEL_FILE_NAME}): ${errorMessage}`);
    return { model: undefined, state: 'error' as const };
  }
};
