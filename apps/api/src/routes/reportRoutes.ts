import { Router } from 'express';
import { createReport, getReports, getReporterHistory, resolveReport } from '../controllers/reportController';
import { authenticateJWT, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/reports', authenticateJWT, authorizeRole('Relawan'), createReport);
router.get('/reports/history', authenticateJWT, authorizeRole('Relawan'), getReporterHistory);
router.patch('/reports/:id/resolve', authenticateJWT, authorizeRole('Relawan'), resolveReport);
router.get('/reports', getReports);

export default router;
