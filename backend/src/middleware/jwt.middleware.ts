import { Request, Response, NextFunction } from 'express';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { AuthService, JWTPayload } from '../services/AuthService';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: User;
  token?: string;
  payload?: JWTPayload;
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header and attaches user to request
 */
export class JWTMiddleware {
  private authService: AuthService;

  constructor(userRepository: Repository<User>) {
    this.authService = new AuthService(userRepository);
  }

  authenticate = (userRepository: Repository<User>) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          res.status(401).json({
            success: false,
            message: 'Authorization header is missing',
          });
          return;
        }

        // Extract token from "Bearer <token>"
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
          res.status(401).json({
            success: false,
            message: 'Invalid authorization header format. Expected "Bearer <token>"',
          });
          return;
        }

        const token = parts[1];

        // Verify token
        const payload = this.authService.verifyToken(token);
        req.payload = payload;
        req.token = token;

        // Load user from database
        const user = await userRepository.findOne({
          where: { id: payload.id },
        });

        if (!user) {
          res.status(401).json({
            success: false,
            message: 'User not found',
          });
          return;
        }

        if (!user.is_active) {
          res.status(401).json({
            success: false,
            message: 'User account is inactive',
          });
          return;
        }

        req.user = user;
        next();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication failed';
        logger.warn(message, { endpoint: req.path });

        res.status(401).json({
          success: false,
          message,
        });
      }
    };
  };

  /**
   * Optional authentication middleware
   * Attaches user if token is provided, but doesn't fail if missing
   */
  authenticateOptional = (userRepository: Repository<User>) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;

        if (authHeader) {
          const parts = authHeader.split(' ');
          if (parts.length === 2 && parts[0] === 'Bearer') {
            const token = parts[1];

            try {
              const payload = this.authService.verifyToken(token);
              req.payload = payload;
              req.token = token;

              const user = await userRepository.findOne({
                where: { id: payload.id },
              });

              if (user && user.is_active) {
                req.user = user;
              }
            } catch (error) {
              // Token is invalid, continue without user
            }
          }
        }

        next();
      } catch (error) {
        // Continue without authentication
        next();
      }
    };
  };
}

/**
 * Role-based authorization middleware
 */
export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
      });

      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}
