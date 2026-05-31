import { Request, Response, NextFunction } from 'express';
import { AuthProfileRepository } from './authProfile.repository.js';

export class AuthProfileController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await AuthProfileRepository.getProfile(req.user!.uid);
      res.json({
        uid: req.user!.uid,
        email: req.user!.email,
        displayName: profile.displayName || profile.display_name || req.user!.displayName || null,
        photoURL: profile.photoURL || profile.avatar_url || null,
        ...profile,
      });
    } catch (error) {
      next(error);
    }
  }
}
