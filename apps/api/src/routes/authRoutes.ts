import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { updateFcmToken, deleteFcmToken } from '../controllers/fcmController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Rute manajemen token FCM (memerlukan otentikasi JWT)
router.put('/fcm-token', authenticateJWT, updateFcmToken);
router.delete('/fcm-token', authenticateJWT, deleteFcmToken);

export default router;
