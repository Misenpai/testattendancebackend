// src/routes/userLocation.route.ts
import { Router } from 'express';
import {
  saveFieldTrips,
  getFieldTrips,
  getUserFieldTrips,
  getUserFieldTripsByUsername, // Keep for username operations
  getUserFieldTripsByEmployeeNumber, // Add for employeeNumber operations
  checkAndDeactivateExpiredFieldTrips,
  processFieldTripAttendance,
  deleteFieldTrip,
  getAllActiveFieldTrips,
  updateFieldTrip
} from '../controllers/userLocation.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Field trip management routes (protected)
router.put('/field-trips', authenticateToken, saveFieldTrips);
router.get('/field-trips/:employeeNumber', authenticateToken, getFieldTrips);
router.get('/user-field-trips/:employeeNumber', authenticateToken, getUserFieldTrips);

// Keep both username and employeeNumber endpoints for flexibility
router.get('/user-field-trips/username/:username', authenticateToken, getUserFieldTripsByUsername);
router.get('/user-field-trips/employee/:employeeNumber', authenticateToken, getUserFieldTripsByEmployeeNumber);

// Additional field trip management routes
router.delete('/field-trip/:fieldTripKey', authenticateToken, deleteFieldTrip);
router.patch('/field-trip/:fieldTripKey', authenticateToken, updateFieldTrip);
router.get('/field-trips', authenticateToken, getAllActiveFieldTrips);

// Admin/system routes for field trip management
router.post('/field-trips/check-expired', authenticateToken, checkAndDeactivateExpiredFieldTrips);
router.post('/field-trips/process-attendance', authenticateToken, processFieldTripAttendance);

export default router;