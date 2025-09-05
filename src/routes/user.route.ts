// user.route.ts
import { Router } from 'express';
import { loginUser, getUserById } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', loginUser); // Still uses username in request body
router.get('/user/:employeeNumber', authenticateToken, getUserById); // Uses employeeNumber in URL

export default router;