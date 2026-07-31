import { Router } from 'express';
import { createReport } from '../controllers/reportController';

const router = Router();

router.post('/reports', createReport);

export default router;
