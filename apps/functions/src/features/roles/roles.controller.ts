import { Request, Response, NextFunction } from 'express';
import { RolesRepository } from './roles.repository.js';

export class RolesController {
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid, role, roles, permissions, assignedModules } = req.body;
      const profile = await RolesRepository.updateRole(
        uid,
        { role, roles, permissions, assignedModules },
        { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId }
      );
      res.json({ success: true, uid, profile });
    } catch (error) {
      next(error);
    }
  }
}
