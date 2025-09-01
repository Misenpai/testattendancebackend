import { Router } from 'express';
import { 
  createAttendance,
  checkoutAttendance,
  getTodayAttendance,
  getUserAttendanceCalendar,
  getAllUsersWithAttendance
} from '../controllers/attendance.controller.js';
import { upload } from '../utils/fileUpload.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Protected user routes
router.post('/attendance', authenticateToken, upload.any(), createAttendance);
router.post('/attendance/checkout', authenticateToken, checkoutAttendance);
router.get('/attendance/today/:username', authenticateToken, getTodayAttendance);
router.get('/attendance/calendar/:employeeNumber', authenticateToken, getUserAttendanceCalendar);

// Admin routes
router.get('/admin/users-attendance', authenticateToken, getAllUsersWithAttendance);

export default router;