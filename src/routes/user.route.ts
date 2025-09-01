// user.route.ts
import { Router } from 'express';
import { loginUser, getUserById } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', loginUser);
router.get('/user/:employeeNumber', authenticateToken, getUserById);

export default router;