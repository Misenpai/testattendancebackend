// src/routes/profile.route.ts
import { Router } from 'express';
import { 
  getUserProfile, 
  getUserProfileByUsername, 
  updateUserProfile,
  updateUserLocation
} from '../controllers/profile.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All profile routes are protected
router.get('/profile/:empCode', authenticateToken, getUserProfile);
router.get('/profile/username/:username', authenticateToken, getUserProfileByUsername);
router.put('/profile/:empCode', authenticateToken, updateUserProfile);
router.patch('/profile/:empCode/location', authenticateToken, updateUserLocation);

export default router;