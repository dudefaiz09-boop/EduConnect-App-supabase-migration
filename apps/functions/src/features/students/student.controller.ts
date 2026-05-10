import { Request, Response, NextFunction } from 'express';
import { StudentRepository } from './student.repository.js';

export class StudentController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await StudentRepository.create(req.body);
      res.status(201).json({ success: true, data: student });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const uid = req.params.uid as string;
      const student = await StudentRepository.update(uid, req.body);
      res.json({ success: true, data: student });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const uid = req.params.uid as string;
      const student = await StudentRepository.getById(uid);
      res.json({ success: true, data: student });
    } catch (error) {
      next(error);
    }
  }
}
