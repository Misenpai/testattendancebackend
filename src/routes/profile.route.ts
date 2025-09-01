// src/routes/profile.route.ts
import { Router } from 'express';
import { 
  getUserProfileByUsername, 
  updateUserProfile
} from '../controllers/profile.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All profile routes are protected
router.get('/profile/username/:username', authenticateToken, getUserProfileByUsername);
router.put('/profile/username/:username', authenticateToken, updateUserProfile);

export default router;