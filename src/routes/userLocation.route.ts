// src/routes/userLocation.route.ts
import { Router } from 'express';
import {
  updateUserLocation,
  getUserLocationWithFieldTrips,
  processFieldTripAttendance,
  getUserLocationByUsername,
  saveFieldTrips,
  getFieldTrips
} from '../controllers/userLocation.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Protected routes
router.put('/user-location', authenticateToken, updateUserLocation);
router.get('/user-location/:empCode', authenticateToken, getUserLocationWithFieldTrips);

// Field trip specific routes
router.put('/user-location/field-trips', saveFieldTrips);
router.get('/user-location/field-trips/:empCode', getFieldTrips);

router.post('/field-trips/process-attendance', authenticateToken, processFieldTripAttendance);
router.get('/user-location/username/:username', authenticateToken, getUserLocationByUsername);

export default router;