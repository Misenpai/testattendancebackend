// src/routes/attendance.route.ts
import { Router } from 'express';
import { 
  createAttendance,
  checkoutAttendance,
  getAttendanceCalendar,
  getUserAttendanceSummary,
  getAllUsersWithAttendance,
  getUserAttendanceDetails,
  getTodayAttendance
} from '../controllers/attendance.controller.js';
import { upload } from '../utils/fileUpload.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Protected user routes
router.post(
  '/attendance',
  authenticateToken,
  upload.any(),
  createAttendance
);

// Checkout endpoint
router.post('/attendance/checkout', authenticateToken, checkoutAttendance);

// Get today's attendance for a user
router.get('/attendance/today/:username', authenticateToken, getTodayAttendance);

// Get attendance calendar data for a user (for mobile app profile)
router.get('/attendance/calendar/:empCode', authenticateToken, getAttendanceCalendar);

// Get user attendance summary for profile
router.get('/attendance/summary/:empCode', authenticateToken, getUserAttendanceSummary);

// Admin routes - Still protected
router.get('/admin/users-attendance' , getAllUsersWithAttendance);
router.get('/admin/users/:empCode/attendance', getUserAttendanceDetails);

export default router;