import { Router } from 'express';
import { 
  createAttendance,
  checkoutAttendance,
  getTodayAttendance,
  getUserAttendanceCalendar,
} from '../controllers/attendance.controller.js';
import { upload } from '../utils/fileUpload.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Mixed approach: attendance creation uses username (for files), other operations use employeeNumber
router.post('/attendance', authenticateToken, upload.any(), createAttendance); // Uses username in body
router.post('/attendance/checkout', authenticateToken, checkoutAttendance); // Uses employeeNumber in body
router.get('/attendance/today/:employeeNumber', authenticateToken, getTodayAttendance); // Uses employeeNumber in URL
router.get('/attendance/calendar/:employeeNumber', authenticateToken, getUserAttendanceCalendar); // Uses employeeNumber in URL

export default router;