import { Request, Response, NextFunction } from 'express';
import { OwnProfileRepository } from './ownProfile.repository.js';

export class OwnProfileController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await OwnProfileRepository.getProfile(req.user!.uid);
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

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const uid = req.user!.uid;
      const { displayName, photoURL } = req.body;
      const profile = await OwnProfileRepository.updateProfile(
        uid,
        req.user!.email,
        displayName,
        photoURL
      );
      res.json({ success: true, profile });
    } catch (error) {
      next(error);
    }
  }
}
