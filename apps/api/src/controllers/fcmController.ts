import { Response } from 'express';
import { AuthRequest } from '../types/authRequest';
import { User } from '../models/UserSchema';

/**
 * Menyimpan atau memperbarui token FCM perangkat pengguna.
 * Dipanggil saat login/register dan saat token refresh.
 * PUT /api/auth/fcm-token
 */
export const updateFcmToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Tidak terotentikasi. Token JWT tidak valid.',
      });
      return;
    }

    const { fcmToken } = req.body as { fcmToken: string };

    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'fcmToken wajib disertakan dan tidak boleh kosong.',
      });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { fcmToken: fcmToken.trim() },
      { new: true, select: 'name email fcmToken' }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
      return;
    }

    console.log(`[FCM Controller] Token FCM diperbarui untuk pengguna: ${updatedUser.name}`);

    res.status(200).json({
      success: true,
      message: 'Token FCM berhasil disimpan.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Controller - updateFcmToken] Gagal menyimpan token FCM: ${errorMessage}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi galat internal saat menyimpan token FCM.',
      error: errorMessage,
    });
  }
};

/**
 * Menghapus token FCM perangkat pengguna saat logout.
 * DELETE /api/auth/fcm-token
 */
export const deleteFcmToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Tidak terotentikasi. Token JWT tidak valid.',
      });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { fcmToken: null } },
      { new: true, select: 'name email' }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan.',
      });
      return;
    }

    console.log(`[FCM Controller] Token FCM dihapus untuk pengguna: ${updatedUser.name} (logout)`);

    res.status(200).json({
      success: true,
      message: 'Token FCM berhasil dihapus.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Error Controller - deleteFcmToken] Gagal menghapus token FCM: ${errorMessage}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi galat internal saat menghapus token FCM.',
      error: errorMessage,
    });
  }
};
