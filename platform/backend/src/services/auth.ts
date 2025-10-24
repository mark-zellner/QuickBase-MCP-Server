import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Local type definitions (will be replaced with shared types in future tasks)
export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  MANAGER = 'manager',
  USER = 'user'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private users: Map<string, User & { passwordHash: string }> = new Map();

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    if (this.jwtSecret === 'default-secret-key') {
      console.warn('⚠️  Using default JWT secret. Set JWT_SECRET environment variable for production.');
    }

    // Initialize with a default admin user for development
    this.initializeDefaultUsers();
  }

  private initializeDefaultUsers(): void {
    const defaultAdmin: User & { passwordHash: string } = {
      id: 'admin-001',
      email: 'admin@dealership.com',
      name: 'System Administrator',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: bcrypt.hashSync('admin123', 10), // Default password for development
    };

    const defaultDeveloper: User & { passwordHash: string } = {
      id: 'dev-001',
      email: 'developer@dealership.com',
      name: 'Lead Developer',
      role: UserRole.DEVELOPER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: bcrypt.hashSync('dev123', 10), // Default password for development
    };

    this.users.set(defaultAdmin.id, defaultAdmin);
    this.users.set(defaultDeveloper.id, defaultDeveloper);

    console.log('🔐 Initialized default users for development:');
    console.log('   Admin: admin@dealership.com / admin123');
    console.log('   Developer: developer@dealership.com / dev123');
  }

  async register(input: RegisterInput): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existingUser = Array.from(this.users.values()).find(u => u.email === input.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Create new user
    const user: User & { passwordHash: string } = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: input.email,
      name: input.name,
      role: input.role || UserRole.USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash,
    };

    // Store user
    this.users.set(user.id, user);

    // Generate token
    const token = this.generateToken(user);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(input: LoginInput): Promise<{ user: User; token: string }> {
    // Find user by email
    const user = Array.from(this.users.values()).find(u => u.email === input.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.updatedAt = new Date();

    // Generate token
    const token = this.generateToken(user);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async getUserById(userId: string): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (!user) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn as any });
  }

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async refreshToken(token: string): Promise<string> {
    const payload = this.verifyToken(token);
    const user = await this.getUserById(payload.userId);
    
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    return this.generateToken(user);
  }

  hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.USER]: 0,
      [UserRole.MANAGER]: 1,
      [UserRole.DEVELOPER]: 2,
      [UserRole.ADMIN]: 3,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  async updateUser(userId: string, updates: Partial<Pick<User, 'name' | 'email' | 'role' | 'isActive'>>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update user properties
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    user.updatedAt = new Date();

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date();
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).map(user => {
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async deleteUser(userId: string): Promise<void> {
    const deleted = this.users.delete(userId);
    if (!deleted) {
      throw new Error('User not found');
    }
  }
}