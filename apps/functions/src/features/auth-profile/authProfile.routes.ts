import { Router } from 'express';
import { AuthProfileController } from './authProfile.controller.js';

const router: Router = Router();

router.get('/profile', AuthProfileController.getProfile);

export default router;
