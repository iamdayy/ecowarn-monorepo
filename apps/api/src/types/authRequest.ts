import { Request } from 'express';
import { UserRole } from '../models/UserSchema';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}
