import { useTensorflowModel } from 'react-native-fast-tflite';

const MODEL_FILE_NAME = 'ecowarn_trash_detector';

export const useTrashDetectorModel = () => {
  try {
    // Memuat model object detection untuk eksekusi Client-Side Inference
    const plugin = useTensorflowModel(require('../assets/ecowarn_trash_detector.tflite'), []);
    return plugin;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error AI Service] Gagal memuat model TFLite (${MODEL_FILE_NAME}): ${errorMessage}`);
    return { model: undefined, state: 'error' as const };
  }
};
