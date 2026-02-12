import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/User.entity';
import logger from '../utils/logger';

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface JWTPayload {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  constructor(private userRepository: Repository<User>) {}

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Password hashing failed', { error });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Validate password against hash
   */
  async validatePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password validation failed', { error });
      return false;
    }
  }

  /**
   * Register new user
   */
  async register(registerDTO: RegisterDTO): Promise<User> {
    const { username, email, password, role = UserRole.VIEWER } = registerDTO;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new Error('User with this username or email already exists');
    }

    // Validate password strength
    this.validatePasswordStrength(password);

    // Hash password
    const password_hash = await this.hashPassword(password);

    // Create user
    const user = this.userRepository.create({
      username,
      email,
      password_hash,
      role,
      is_active: true,
    });

    const savedUser = await this.userRepository.save(user);
    logger.info(`User registered: ${username}`, { userId: savedUser.id });

    return savedUser;
  }

  /**
   * Login user
   */
  async login(loginDTO: LoginDTO): Promise<AuthResponse> {
    const { username, password } = loginDTO;

    // Find user
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      logger.warn(`Login failed: user not found`, { username });
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    // Check if user is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new Error('User account is locked. Please try again later.');
    }

    // Validate password
    const isValidPassword = await this.validatePassword(password, user.password_hash);

    if (!isValidPassword) {
      // Increment login attempts
      user.login_attempts = (user.login_attempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (user.login_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        logger.warn(`User account locked due to failed login attempts`, {
          userId: user.id,
          username,
        });
      }

      await this.userRepository.save(user);
      logger.warn(`Login failed: invalid password`, { username, attempts: user.login_attempts });
      throw new Error('Invalid credentials');
    }

    // Reset login attempts on successful login
    user.login_attempts = 0;
    user.last_login = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    logger.info(`User logged in: ${username}`, { userId: user.id });

    return {
      user,
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRATION || '15m',
    };
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(user: User): string {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const payload: JWTPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, jwtSecret as string, {
      expiresIn: process.env.JWT_EXPIRATION || '15m',
      algorithm: 'HS256',
    } as any);
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(user: User): string {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const payload: JWTPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, jwtSecret as string, {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      algorithm: 'HS256',
    } as any);
  }

  /**
   * Verify JWT token and return payload
   */
  verifyToken(token: string): JWTPayload {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    try {
      return jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
      }) as JWTPayload;
    } catch (error) {
      logger.warn('Token verification failed', { error: String(error) });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: string }> {
    const payload = this.verifyToken(refreshToken);

    const user = await this.userRepository.findOne({
      where: { id: payload.id },
    });

    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    const accessToken = this.generateAccessToken(user);

    return {
      accessToken,
      expiresIn: process.env.JWT_EXPIRATION || '15m',
    };
  }

  /**
   * Validate password strength
   * Minimum 8 characters, at least one uppercase, one lowercase, one number
   */
  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < minLength || !hasUppercase || !hasLowercase || !hasNumber) {
      throw new Error(
        'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers'
      );
    }
  }
}
