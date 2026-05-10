import { Router } from 'express';
import { StudentController } from './student.controller';
import { validate } from '../../middleware/validate';
import { createStudentSchema, updateStudentSchema, studentQuerySchema } from './student.validation';
import { checkPermission } from '../../middleware/auth';

const router = Router();

router.post(
  '/create', 
  checkPermission('manageStudents'), 
  validate(createStudentSchema), 
  StudentController.create
);

router.put(
  '/:uid', 
  checkPermission('manageStudents'), 
  validate(updateStudentSchema), 
  StudentController.update
);

router.get(
  '/:uid', 
  checkPermission('viewStudentDetails'), 
  validate(studentQuerySchema), 
  StudentController.getProfile
);

export default router;
