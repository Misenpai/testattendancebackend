// src/routes/pi.route.ts
import { Router } from 'express';
import { 
  loginPI,
  getPIUsersAttendance
} from '../controllers/pi.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/pi/login', loginPI);
router.get('/pi/users-attendance', authenticateToken, getPIUsersAttendance);

export default router;