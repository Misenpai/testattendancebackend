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

const router = Router();

// User routes
router.post(
  '/attendance',
  upload.any(),
  createAttendance
);

// Checkout endpoint
router.post('/attendance/checkout', checkoutAttendance);

// Get today's attendance for a user
router.get('/attendance/today/:username', getTodayAttendance);

// Get attendance calendar data for a user (for mobile app profile)
router.get('/attendance/calendar/:empCode', getAttendanceCalendar);

// Get user attendance summary for profile
router.get('/attendance/summary/:empCode', getUserAttendanceSummary);

// Admin routes (No authentication required - for admin dashboard)
router.get('/admin/users-attendance', getAllUsersWithAttendance);
router.get('/admin/users/:empCode/attendance', getUserAttendanceDetails);

export default router;