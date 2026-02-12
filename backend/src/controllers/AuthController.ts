import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { AuthService, RegisterDTO, LoginDTO } from '../services/AuthService';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: User;
  token?: string;
}

export class AuthController {
  private authService: AuthService;

  constructor(userRepository: Repository<User>) {
    this.authService = new AuthService(userRepository);
  }

  /**
   * POST /api/auth/register
   * Register new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;

      // Basic validation
      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'Username, email, and password are required',
        });
        return;
      }

      const registerDTO: RegisterDTO = {
        username: String(username).trim(),
        email: String(email).trim().toLowerCase(),
        password: String(password),
      };

      const user = await this.authService.register(registerDTO);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      logger.error(message, { endpoint: '/api/auth/register' });

      res.status(400).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/auth/login
   * Login user and return JWT tokens
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      // Basic validation
      if (!username || !password) {
        res.status(400).json({
          success: false,
          message: 'Username and password are required',
        });
        return;
      }

      const loginDTO: LoginDTO = {
        username: String(username).trim(),
        password: String(password),
      };

      const { user, accessToken, refreshToken, expiresIn } = await this.authService.login(loginDTO);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          accessToken,
          refreshToken,
          expiresIn,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      logger.warn(message, { endpoint: '/api/auth/login' });

      res.status(401).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
        return;
      }

      const { accessToken, expiresIn } = await this.authService.refreshAccessToken(
        String(refreshToken)
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
          expiresIn,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      logger.warn(message, { endpoint: '/api/auth/refresh' });

      res.status(401).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user info (requires authentication)
   */
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          last_login: req.user.last_login,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get user info';
      logger.error(message, { endpoint: '/api/auth/me' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user (token invalidation if needed, placeholder)
   */
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      logger.info(`User logged out: ${req.user.username}`, { userId: req.user.id });

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      logger.error(message, { endpoint: '/api/auth/logout' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }
}
