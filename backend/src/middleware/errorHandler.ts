// backend/src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  console.error(err);

  return res.status(500).json({
    message: err.message || 'Internal Server Error'
  });
};
