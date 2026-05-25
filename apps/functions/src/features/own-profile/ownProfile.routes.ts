import { Router } from 'express';
import { OwnProfileController } from './ownProfile.controller.js';
import { validate } from '../../middleware/validate.js';
import { updateOwnProfileSchema } from './ownProfile.validation.js';

const router: Router = Router();

router.put('/', validate(updateOwnProfileSchema), OwnProfileController.update);

export default router;
