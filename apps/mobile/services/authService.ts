import { getApiUrl } from './apiService';
import { RegisterPayload, LoginPayload, AuthResponse } from '../types/auth';

/**
 * Melakukan panggilan API untuk registrasi akun Warga atau Relawan baru
 */
export const registerUser = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const apiUrl = getApiUrl('/auth/register');
  try {
    console.log(`[Auth Service] Mengirim permintaan registrasi ke: ${apiUrl}`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const textResult = await response.text();
    let result;
    try {
      result = JSON.parse(textResult);
    } catch {
      throw new Error(`Respon server bukan format JSON valid (Status: ${response.status}): ${textResult.slice(0, 150)}`);
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || `Gagal registrasi (HTTP ${response.status})`);
    }

    return result.data as AuthResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
      const netError = `Koneksi ke peladen di (${apiUrl}) terputus. Pastikan server backend ('bun run dev:api') serta MongoDB sudah aktif dan berada pada jaringan LAN/Wi-Fi yang sama.`;
      console.error(`[Error Auth Service - registerUser] ${netError}`);
      throw new Error(netError);
    }
    console.error(`[Error Auth Service - registerUser] Gagal memanggil API registrasi: ${errorMessage}`);
    throw error;
  }
};

/**
 * Melakukan panggilan API untuk otentikasi login dengan Email/Nomor HP dan kata sandi
 */
export const loginUser = async (payload: LoginPayload): Promise<AuthResponse> => {
  const apiUrl = getApiUrl('/auth/login');
  try {
    console.log(`[Auth Service] Mengirim permintaan login ke: ${apiUrl}`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const textResult = await response.text();
    let result;
    try {
      result = JSON.parse(textResult);
    } catch {
      throw new Error(`Respon server bukan format JSON valid (Status: ${response.status}): ${textResult.slice(0, 150)}`);
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || `Gagal login (HTTP ${response.status})`);
    }

    return result.data as AuthResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
      const netError = `Koneksi ke peladen di (${apiUrl}) terputus. Pastikan server backend ('bun run dev:api') serta MongoDB sudah aktif dan berada pada jaringan LAN/Wi-Fi yang sama.`;
      console.error(`[Error Auth Service - loginUser] ${netError}`);
      throw new Error(netError);
    }
    console.error(`[Error Auth Service - loginUser] Gagal memanggil API login: ${errorMessage}`);
    throw error;
  }
};
