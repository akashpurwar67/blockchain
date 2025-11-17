import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import logger from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        mspID: string;
        organization: string;
      };
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 * In production, this would verify against Fabric MSP certificates
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    // Verify JWT token
    const decoded: any = jwt.verify(token, config.jwt.secret as string);

    // Attach user info to request
    req.user = {
      id: decoded.id,
      mspID: decoded.mspID,
      organization: decoded.organization,
    };

    logger.info(`User authenticated: ${decoded.id} from ${decoded.organization}`);
    next();
  } catch (error) {
    logger.error(`Authentication failed: ${error}`);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(
  userID: string,
  mspID: string,
  organization: string
): string {
  return jwt.sign(
    { id: userID, mspID, organization },
    config.jwt.secret as string,
    { 
      expiresIn: '24h'
    } as any
  );
}
