import { Router } from 'express';
import { createReport, getReports } from '../controllers/reportController';

const router = Router();

router.post('/reports', createReport);
router.get('/reports', getReports);

export default router;
