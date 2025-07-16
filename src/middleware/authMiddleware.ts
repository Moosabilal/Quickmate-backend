import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthPayload {
  id: string;
  role: string
}
export interface AuthRequest extends Request {
  user?: AuthPayload;
}


export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.cookies.token;
  if (!token) {
    res.status(401).json({ message: 'Access token not found' });
    return; 
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded as AuthPayload;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Access token invalid or expired' });
    return; 
  }
};


export const authorizeRoles = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => { 
    
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated for role check.' });
      return; 
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied: Insufficient privileges.' });
      return; 
    }
    next(); 
  };
};