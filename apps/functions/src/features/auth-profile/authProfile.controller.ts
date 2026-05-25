import { Request, Response, NextFunction } from 'express';
import { AuthProfileRepository } from './authProfile.repository.js';

export class AuthProfileController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await AuthProfileRepository.getProfile(req.user!.uid);
      res.json({
        uid: req.user!.uid,
        email: req.user!.email,
        displayName: req.user!.displayName,
        ...profile,
      });
    } catch (error) {
      next(error);
    }
  }
}
