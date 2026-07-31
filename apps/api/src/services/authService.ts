import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/UserSchema';

const JWT_SECRET = process.env.JWT_SECRET || 'ecowarn-super-secret-jwt-key-2026';

export interface RegisterPayload {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
  fcmToken?: string;
}

export interface LoginPayload {
  identifier: string; // Bisa Email atau Nomor HP
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: UserRole;
    fcmToken?: string;
  };
}

/**
 * Menghasilkan token JWT yang memegang otorisasi identitas dan peran pengguna (RBAC)
 */
const generateAuthToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Mendaftarkan akun baru dengan validasi duplikasi Email atau Nomor Handphone
 */
export const registerService = async (payload: RegisterPayload): Promise<AuthResponse> => {
  try {
    const { name, email, phoneNumber, password, role, fcmToken } = payload;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phoneNumber }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('Alamat email sudah terdaftar.');
      }
      throw new Error('Nomor handphone sudah terdaftar.');
    }

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      phoneNumber,
      password,
      role,
      fcmToken,
    });

    const token = generateAuthToken(newUser._id.toString(), newUser.role);

    return {
      token,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        fcmToken: newUser.fcmToken,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Service - registerService] Gagal meregistrasi pengguna: ${errorMessage}`);
    throw new Error(errorMessage);
  }
};

/**
 * Memverifikasi kredensial pengguna via Email/Nomor HP dan Kata Sandi, kemudian mengotentikasi sesi JWT
 */
export const loginService = async (payload: LoginPayload): Promise<AuthResponse> => {
  try {
    const { identifier, password } = payload;

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phoneNumber: identifier }],
    });

    if (!user) {
      throw new Error('Akun tidak ditemukan. Periksa kembali Email/Nomor HP Anda.');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Kata sandi yang Anda masukkan tidak benar.');
    }

    const token = generateAuthToken(user._id.toString(), user.role);

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        fcmToken: user.fcmToken,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Service - loginService] Gagal mengotentikasi login: ${errorMessage}`);
    throw new Error(errorMessage);
  }
};
