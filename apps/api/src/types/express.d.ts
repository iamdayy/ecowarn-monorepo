import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: 'Relawan' | 'Warga';
      };
    }
  }
}
