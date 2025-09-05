// src/routes/profile.route.ts
import { Router } from 'express';
import { 
  getUserProfileByEmployeeNumber, 
  updateUserProfile
} from '../controllers/profile.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Profile routes use employeeNumber
router.get('/profile/:employeeNumber', authenticateToken, getUserProfileByEmployeeNumber);
router.put('/profile/:employeeNumber', authenticateToken, updateUserProfile);

export default router;