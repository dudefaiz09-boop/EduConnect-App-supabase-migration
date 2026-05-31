import { Router } from 'express';
import { OwnProfileController } from './ownProfile.controller.js';
import { validate } from '../../middleware/validate.js';
import { updateOwnProfileSchema } from './ownProfile.validation.js';

const router: Router = Router();

// GET /api/users/profile — read own profile (no tenant required)
router.get('/', OwnProfileController.getProfile);

// PUT /api/users/profile — update own display name / avatar (no tenant required)
router.put('/', validate(updateOwnProfileSchema), OwnProfileController.update);

export default router;
