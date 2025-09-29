import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your_jwt_secret_key_here';

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Handle admin users
    if (decoded.isAdmin && decoded.userId === 'admin') {
      req.user = {
        _id: 'admin',
        email: process.env['ADMIN_EMAIL'] || 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return next();
    }
    
    // Handle regular users (would need to fetch from database in real implementation)
    // For now, create a mock user
    req.user = {
      _id: decoded.userId,
      email: decoded.email || 'user@example.com',
      firstName: decoded.firstName || 'User',
      lastName: decoded.lastName || 'Name',
      role: decoded.role || 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      req.user = undefined as any;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Handle admin users
    if (decoded.isAdmin && decoded.userId === 'admin') {
      req.user = {
        _id: 'admin',
        email: process.env['ADMIN_EMAIL'] || 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return next();
    }
    
    // Handle regular users
    req.user = {
      _id: decoded.userId,
      email: decoded.email || 'user@example.com',
      firstName: decoded.firstName || 'User',
      lastName: decoded.lastName || 'Name',
      role: decoded.role || 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    next();
  } catch (error) {
    req.user = undefined as any;
    next();
  }
};
