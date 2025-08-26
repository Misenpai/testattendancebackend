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

const router = Router();

router.put('/user-location', updateUserLocation);
router.get('/user-location/:empCode', getUserLocationWithFieldTrips);

// Field trip specific routes
router.put('/user-location/field-trips', saveFieldTrips);
router.get('/user-location/field-trips/:empCode', getFieldTrips);

router.post('/field-trips/process-attendance', processFieldTripAttendance);
router.get('/user-location/username/:username', getUserLocationByUsername);

export default router;