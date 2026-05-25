import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, type ZodIssue } from 'zod';
import { AppError } from './error.js';

/**
 * Zod Validation Middleware
 * Validates req.body, req.query, and req.params against a schema.
 */
export const validate =
  (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError({
            code: 'VALIDATION_ERROR',
            message: 'The request contains invalid data.',
            statusCode: 400,
            details: error.issues.map((issue: ZodIssue) => ({
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            })),
          })
        );
      }
      return next(error);
    }
  };
