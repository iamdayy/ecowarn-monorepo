import { Request, Response } from 'express';
import { registerService, loginService, RegisterPayload, LoginPayload } from '../services/authService';
import { UserRole } from '../models/UserSchema';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phoneNumber, password, role, fcmToken } = req.body as RegisterPayload;

    if (!name || !email || !phoneNumber || !password || !role) {
      res.status(400).json({
        success: false,
        message: 'Data registrasi tidak lengkap. Wajib menyertakan nama, email, phoneNumber, password, dan role.',
      });
      return;
    }

    if (!['Relawan', 'Warga'].includes(role as string)) {
      res.status(400).json({
        success: false,
        message: 'Role tidak valid. Peran pengguna wajib diisi Relawan atau Warga.',
      });
      return;
    }

    const authResponse = await registerService({
      name,
      email,
      phoneNumber,
      password,
      role: role as UserRole,
      fcmToken,
    });

    res.status(201).json({
      success: true,
      message: `Registrasi akun ${role} berhasil. Selamat datang di EcoWarn!`,
      data: authResponse,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Controller - register] Gagal memproses POST /api/auth/register: ${errorMessage}`);
    res.status(400).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, email, phoneNumber, password } = req.body as Record<string, string>;

    const loginId = identifier || email || phoneNumber;

    if (!loginId || !password) {
      res.status(400).json({
        success: false,
        message: 'Wajib mengisi Email/Nomor Handphone dan Kata Sandi.',
      });
      return;
    }

    const authResponse = await loginService({
      identifier: loginId,
      password,
    } as LoginPayload);

    res.status(200).json({
      success: true,
      message: `Otentikasi berhasil. Halo, ${authResponse.user.name}!`,
      data: authResponse,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Controller - login] Gagal memproses POST /api/auth/login: ${errorMessage}`);
    res.status(401).json({
      success: false,
      message: errorMessage,
    });
  }
};
