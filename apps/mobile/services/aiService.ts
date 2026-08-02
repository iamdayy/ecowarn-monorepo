import { useState, useEffect } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';

const MODEL_FILE_NAME = 'ecowarn_trash_detector';

export const useTrashDetectorModel = () => {
  const [modelSource, setModelSource] = useState<{ url: string } | undefined>(undefined);
  const [errorState, setErrorState] = useState<Error | null>(null);

  useEffect(() => {
    const prepareModelAsset = async () => {
      try {
        // Mengekstrak model dari bundel APK Android/iOS ke penyimpanan lokal melalui Expo Asset Manager.
        // Ini mencegah galat 'java.net.MalformedURLException: no protocol: assets_ecowarn_trash_detector'
        // karena Java URL parser membutuhkan skema protokol eksplisit seperti file:// atau http://.
        const assets = await Asset.loadAsync(require('../assets/ecowarn_trash_detector.tflite'));
        const item = Array.isArray(assets) ? assets[0] : assets;
        
        let validUri = item.localUri || item.uri;
        console.log('[AI Service - Asset Preparation] Resolusi awal URI:', validUri);

        // Menjamin kehadiran protokol pada string URI
        if (!validUri.includes('://')) {
          if (validUri.startsWith('/')) {
            validUri = `file://${validUri}`;
          } else {
            // Pada kasus khusus Android di mana path dikembalikan tanpa protokol slashes
            validUri = `file:///${validUri}`;
          }
        }

        console.log('[AI Service - Asset Preparation] URI TFLite siap berprotokol sah:', validUri);
        setModelSource({ url: validUri });
      } catch (error) {
        const errObj = error instanceof Error ? error : new Error(String(error));
        console.error(`[Error AI Service] Gagal mengekstrak aset TFLite (${MODEL_FILE_NAME}): ${errObj.message}`);
        setErrorState(errObj);
      }
    };

    prepareModelAsset();
  }, []);

  const plugin = useTensorflowModel(modelSource as any, []);

  if (errorState) {
    return { model: undefined, state: 'error' as const };
  }

  return plugin;
};
