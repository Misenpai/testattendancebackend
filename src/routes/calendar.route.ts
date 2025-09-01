import { Router } from 'express';
import { 
  getCalendarData,
  getHolidayList,
  addHoliday,
  getWorkingDays
} from '../controllers/calendar.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public calendar routes (for viewing)
router.get('/calendar', getCalendarData);
router.get('/calendar/holidays', getHolidayList);
router.get('/calendar/working-days', getWorkingDays);

// Admin route for adding holidays
router.post('/calendar/holiday', authenticateToken, addHoliday);

export default router;