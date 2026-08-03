import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

/**
 * Penyimpanan cache in-memory untuk hasil Reverse Geocoding.
 * Kunci diindeks menggunakan hash koordinat dengan ketelitian 3 angka desimal (~100 meter),
 * sehingga mencegah pengiriman kueri berulang yang memeras baterai saat melintasi blok yang sama.
 */
const geocodingCache = new Map<string, string>();

export type GeocodeMode = 'full' | 'short';

/**
 * Mengubah koordinat GPS (Lintang, Bujur) menjadi string alamat nyata yang dapat dibaca manusia.
 * Menerapkan prinsip Clean Code dengan penanganan kesalahan ekstensif dan mekanisme cache pintar.
 */
export async function reverseGeocodeToAddress(
  latitude: number,
  longitude: number,
  mode: GeocodeMode = 'full'
): Promise<string> {
  // 1. Buat kunci cache berdasarkan koordinat (presisi ~100 meter)
  const cacheKey = `${latitude.toFixed(3)}_${longitude.toFixed(3)}_${mode}`;
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const addr = results[0];
      
      const street = addr.street || addr.name || null;
      const district = addr.district || null;
      const city = addr.city || addr.subregion || null;
      const region = addr.region || null;

      let formatted: string[] = [];

      if (mode === 'short') {
        // Mode singkat untuk telemetri atau kartu ringkas: e.g. "Kebayoran Baru, Jakarta Selatan"
        if (district && city && district !== city) {
          formatted = [district, city];
        } else if (street && city && street !== city) {
          formatted = [street, city];
        } else if (city || region) {
          formatted = [city || region || ''];
        }
      } else {
        // Mode lengkap untuk modal detail & spesifikasi resmi
        if (street) formatted.push(street);
        if (district && !formatted.includes(district)) formatted.push(district);
        if (city && !formatted.includes(city)) formatted.push(city);
        if (region && !formatted.includes(region)) formatted.push(region);
      }

      // Bersihkan string kosong atau duplikat kata
      const cleanParts = formatted.filter(Boolean).map((s) => s.trim());
      if (cleanParts.length > 0) {
        const resultString = cleanParts.join(', ');
        geocodingCache.set(cacheKey, resultString);
        return resultString;
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Warning Geocoding] Gagal mengonversi koordinat [${latitude}, ${longitude}] ke alamat: ${errMsg}`);
  }

  // Fallback jika tidak ada jaringan atau gagal mendapatkan alamat jalan
  const fallbackString = mode === 'short'
    ? `Koord: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    : `Kawasan Spasial [${latitude.toFixed(5)}, ${longitude.toFixed(5)}]`;
  
  geocodingCache.set(cacheKey, fallbackString);
  return fallbackString;
}

/**
 * React Hook Kustom untuk memperoleh alamat secara responsif dan reaktif berdasarkan koordinat GPS.
 */
export function useCoordinateAddress(
  latitude?: number,
  longitude?: number,
  mode: GeocodeMode = 'full'
) {
  const [address, setAddress] = useState<string>('Memuat alamat lokasi...');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAddress = useCallback(async () => {
    if (latitude === undefined || longitude === undefined || (latitude === 0 && longitude === 0)) {
      setAddress('Koordinat tidak diketahui');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const resolved = await reverseGeocodeToAddress(latitude, longitude, mode);
      setAddress(resolved);
    } catch (error) {
      setAddress(`Koord: ${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`);
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude, mode]);

  useEffect(() => {
    fetchAddress();
  }, [fetchAddress]);

  return { address, isLoading, refetch: fetchAddress };
}
