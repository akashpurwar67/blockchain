import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Middleware to check if user belongs to allowed organization
 */
export function organizationCheck(...allowedOrgs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!allowedOrgs.includes(req.user.mspID)) {
      logger.warn(
        `Unauthorized access attempt from ${req.user.mspID} to restricted resource`
      );
      res.status(403).json({
        error: `Access denied. Required organization: ${allowedOrgs.join(', ')}`,
      });
      return;
    }

    next();
  };
}
