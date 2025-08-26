import { Router } from 'express';
import { 
  getUserProfile, 
  getUserProfileByUsername, 
  updateUserProfile,
  updateUserLocation
} from '../controllers/profile.controller.js';

const router = Router();


router.get('/profile/:empCode', getUserProfile);


router.get('/profile/username/:username', getUserProfileByUsername);


router.put('/profile/:empCode', updateUserProfile);

router.patch('/profile/:empCode/location', updateUserLocation);

export default router;