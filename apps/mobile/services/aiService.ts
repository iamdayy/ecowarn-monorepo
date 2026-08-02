import { useTensorflowModel } from 'react-native-fast-tflite';

const MODEL_FILE_NAME = 'ecowarn_trash_detector';

export const useTrashDetectorModel = () => {
  try {
    // Memuat model object detection dengan akselerasi CPU XNNPACK ARM SIMD (Client-Side Inference).
    // Delegasi CPU XNNPACK ([]) dipilih demi stabilitas 100% pada operator konversi ONNX/NMS
    // dan menghindari ketidakcocokan shader OpenCL pada akselerator ['android-gpu'].
    const plugin = useTensorflowModel(require('../assets/ecowarn_trash_detector.tflite'), []);
    return plugin;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error AI Service] Gagal memuat model TFLite (${MODEL_FILE_NAME}): ${errorMessage}`);
    return { model: undefined, state: 'error' as const };
  }
};
