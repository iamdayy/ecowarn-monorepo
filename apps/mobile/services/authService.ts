import { API_BASE_URL } from './apiService';
import { RegisterPayload, LoginPayload, AuthResponse } from '../types/auth';

/**
 * Melakukan panggilan API untuk registrasi akun Warga atau Relawan baru
 */
export const registerUser = async (payload: RegisterPayload): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `Gagal registrasi (HTTP ${response.status})`);
    }

    return result.data as AuthResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Auth Service - registerUser] Gagal memanggil API registrasi: ${errorMessage}`);
    throw error;
  }
};

/**
 * Melakukan panggilan API untuk otentikasi login dengan Email/Nomor HP dan kata sandi
 */
export const loginUser = async (payload: LoginPayload): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `Gagal login (HTTP ${response.status})`);
    }

    return result.data as AuthResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Auth Service - loginUser] Gagal memanggil API login: ${errorMessage}`);
    throw error;
  }
};
