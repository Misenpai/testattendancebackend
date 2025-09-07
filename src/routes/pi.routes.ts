// src/routes/pi.routes.ts
import { Router } from "express";
import { getPIUsersAttendanceSSO, getPIUsersAttendance } from "../controllers/pi.controller.js";
import { flexibleAuth } from "../middleware/auth.js";

const router = Router();

// SSO-based endpoint (POST - original)
router.post("/pi/users-attendance-sso", getPIUsersAttendanceSSO);

// New GET endpoint that supports both SSO and token auth
router.get("/pi/users-attendance", flexibleAuth, getPIUsersAttendance);

export default router;