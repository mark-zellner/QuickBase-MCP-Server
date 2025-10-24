import { AuthService, UserRole } from '../../services/auth.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.USER
      };

      const result = await authService.register(input);

      expect(result.user.email).toBe(input.email);
      expect(result.user.name).toBe(input.name);
      expect(result.user.role).toBe(input.role);
      expect(result.user.isActive).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user.id).toBeDefined();
    });

    it('should throw error when registering with existing email', async () => {
      const input = {
        email: 'admin@dealership.com', // This email already exists in default users
        password: 'password123',
        name: 'Test User'
      };

      await expect(authService.register(input)).rejects.toThrow('User with this email already exists');
    });

    it('should default to USER role when no role specified', async () => {
      const input = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };

      const result = await authService.register(input);
      expect(result.user.role).toBe(UserRole.USER);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const result = await authService.login({
        email: 'admin@dealership.com',
        password: 'admin123'
      });

      expect(result.user.email).toBe('admin@dealership.com');
      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(result.token).toBeDefined();
      expect(result.user.lastLoginAt).toBeDefined();
    });

    it('should throw error with invalid email', async () => {
      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'password123'
      })).rejects.toThrow('Invalid email or password');
    });

    it('should throw error with invalid password', async () => {
      await expect(authService.login({
        email: 'admin@dealership.com',
        password: 'wrongpassword'
      })).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for inactive user', async () => {
      // First register a user
      const registerResult = await authService.register({
        email: 'inactive@example.com',
        password: 'password123',
        name: 'Inactive User'
      });

      // Deactivate the user
      await authService.updateUser(registerResult.user.id, { isActive: false });

      // Try to login
      await expect(authService.login({
        email: 'inactive@example.com',
        password: 'password123'
      })).rejects.toThrow('Account is deactivated');
    });
  });

  describe('getUserById', () => {
    it('should return user by valid ID', async () => {
      const user = await authService.getUserById('admin-001');
      
      expect(user).toBeDefined();
      expect(user?.email).toBe('admin@dealership.com');
      expect(user?.role).toBe(UserRole.ADMIN);
    });

    it('should return null for invalid ID', async () => {
      const user = await authService.getUserById('nonexistent-id');
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by valid email', async () => {
      const user = await authService.getUserByEmail('developer@dealership.com');
      
      expect(user).toBeDefined();
      expect(user?.id).toBe('dev-001');
      expect(user?.role).toBe(UserRole.DEVELOPER);
    });

    it('should return null for invalid email', async () => {
      const user = await authService.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const user = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const token = authService.generateToken(user);
      expect(token).toBeDefined();

      // Verify token can be decoded
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const user = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const token = authService.generateToken(user);
      const payload = authService.verifyToken(token);

      expect(payload.userId).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.role).toBe(user.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });
  });

  describe('hasPermission', () => {
    it('should allow admin access to all roles', () => {
      expect(authService.hasPermission(UserRole.ADMIN, UserRole.USER)).toBe(true);
      expect(authService.hasPermission(UserRole.ADMIN, UserRole.MANAGER)).toBe(true);
      expect(authService.hasPermission(UserRole.ADMIN, UserRole.DEVELOPER)).toBe(true);
      expect(authService.hasPermission(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
    });

    it('should allow developer access to user and manager roles', () => {
      expect(authService.hasPermission(UserRole.DEVELOPER, UserRole.USER)).toBe(true);
      expect(authService.hasPermission(UserRole.DEVELOPER, UserRole.MANAGER)).toBe(true);
      expect(authService.hasPermission(UserRole.DEVELOPER, UserRole.DEVELOPER)).toBe(true);
      expect(authService.hasPermission(UserRole.DEVELOPER, UserRole.ADMIN)).toBe(false);
    });

    it('should allow manager access to user role only', () => {
      expect(authService.hasPermission(UserRole.MANAGER, UserRole.USER)).toBe(true);
      expect(authService.hasPermission(UserRole.MANAGER, UserRole.MANAGER)).toBe(true);
      expect(authService.hasPermission(UserRole.MANAGER, UserRole.DEVELOPER)).toBe(false);
      expect(authService.hasPermission(UserRole.MANAGER, UserRole.ADMIN)).toBe(false);
    });

    it('should allow user access to user role only', () => {
      expect(authService.hasPermission(UserRole.USER, UserRole.USER)).toBe(true);
      expect(authService.hasPermission(UserRole.USER, UserRole.MANAGER)).toBe(false);
      expect(authService.hasPermission(UserRole.USER, UserRole.DEVELOPER)).toBe(false);
      expect(authService.hasPermission(UserRole.USER, UserRole.ADMIN)).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updatedUser = await authService.updateUser('admin-001', {
        name: 'Updated Admin Name',
        email: 'updated-admin@dealership.com'
      });

      expect(updatedUser.name).toBe('Updated Admin Name');
      expect(updatedUser.email).toBe('updated-admin@dealership.com');
      expect(updatedUser.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(authService.updateUser('nonexistent-id', {
        name: 'New Name'
      })).rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      await expect(authService.changePassword('admin-001', 'admin123', 'newpassword123')).resolves.not.toThrow();
    });

    it('should throw error for incorrect current password', async () => {
      await expect(authService.changePassword('admin-001', 'wrongpassword', 'newpassword123'))
        .rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for non-existent user', async () => {
      await expect(authService.changePassword('nonexistent-id', 'password', 'newpassword'))
        .rejects.toThrow('User not found');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users without password hashes', async () => {
      const users = await authService.getAllUsers();
      
      expect(users.length).toBeGreaterThanOrEqual(2); // At least admin and developer
      users.forEach(user => {
        expect(user).not.toHaveProperty('passwordHash');
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.role).toBeDefined();
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // First register a user to delete
      const registerResult = await authService.register({
        email: 'todelete@example.com',
        password: 'password123',
        name: 'To Delete'
      });

      await expect(authService.deleteUser(registerResult.user.id)).resolves.not.toThrow();
      
      // Verify user is deleted
      const deletedUser = await authService.getUserById(registerResult.user.id);
      expect(deletedUser).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(authService.deleteUser('nonexistent-id')).rejects.toThrow('User not found');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token for active user', async () => {
      const originalToken = authService.generateToken({
        id: 'admin-001',
        email: 'admin@dealership.com',
        name: 'System Administrator',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newToken = await authService.refreshToken(originalToken);
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(originalToken);

      // Verify new token is valid
      const payload = authService.verifyToken(newToken);
      expect(payload.userId).toBe('admin-001');
    });

    it('should throw error for inactive user', async () => {
      // Register and deactivate a user
      const registerResult = await authService.register({
        email: 'inactive-refresh@example.com',
        password: 'password123',
        name: 'Inactive User'
      });

      const token = registerResult.token;
      await authService.updateUser(registerResult.user.id, { isActive: false });

      await expect(authService.refreshToken(token)).rejects.toThrow('User not found or inactive');
    });
  });
});