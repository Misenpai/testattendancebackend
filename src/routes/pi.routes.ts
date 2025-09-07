// src/routes/pi.route.ts
import { Router } from "express";
import { getPIUsersAttendanceSSO } from "../controllers/pi.controller.js";

const router = Router();

// Remove login route
// router.post('/pi/login', loginPI); // REMOVE THIS

// SSO-based endpoint (no auth middleware needed as it's SSO)
router.post("/pi/users-attendance-sso", getPIUsersAttendanceSSO);

export default router;
