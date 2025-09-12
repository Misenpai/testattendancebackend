import { Router } from 'express';
import { 
    hrLogin, 
    getAllPIs, 
    requestDataFromPIs, 
    getSubmissionStatus, 
    downloadReport 
} from '../controllers/hr.controller.js';
import { flexibleAuth } from '../middleware/auth.js';

const router = Router();

router.post('/hr/login', hrLogin);
router.get('/hr/pis', flexibleAuth, getAllPIs);
router.post('/hr/request-data', flexibleAuth, requestDataFromPIs);
router.get('/hr/submission-status', flexibleAuth, getSubmissionStatus);
router.get('/hr/download-report', flexibleAuth, downloadReport);

export default router;