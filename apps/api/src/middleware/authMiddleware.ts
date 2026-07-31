import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ecowarn-super-secret-jwt-key-2026';

interface JwtPayload {
  userId: string;
  role: 'Relawan' | 'Warga';
}

/**
 * Middleware untuk memverifikasi token JWT dari header Authorization (Bearer token)
 * dan menyematkan payload identitas dan peran ke objek request (req.user)
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token autentikasi (Bearer token) tidak ditemukan pada request ini.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Middleware - authenticateJWT] Token tidak valid atau kedaluwarsa: ${errorMessage}`);
    res.status(401).json({
      success: false,
      message: 'Token autentikasi tidak valid atau telah kedaluwarsa. Silakan login kembali.',
    });
  }
};

/**
 * Middleware Role-Based Access Control untuk melarang akses pada rute sensitif (seperti pelaporan kamera)
 * jika peran pengguna (role) tidak memenuhi syarat yang ditetapkan (misalnya 'Relawan')
 */
export const authorizeRole = (requiredRole: 'Relawan' | 'Warga') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Otorisasi gagal. Identitas pengguna belum terautentikasi.',
        });
        return;
      }

      if (req.user.role !== requiredRole) {
        res.status(403).json({
          success: false,
          message: `Akses ditolak (HTTP 403 Forbidden). Rute ini eksklusif untuk peran [${requiredRole}], sedangkan peran Anda saat ini adalah [${req.user.role}].`,
        });
        return;
      }

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Middleware - authorizeRole] Gagal memvalidasi peran pengguna: ${errorMessage}`);
      res.status(500).json({
        success: false,
        message: 'Terjadi galat internal saat memeriksa hak akses pengguna.',
      });
    }
  };
};
