export type UserRole = 'Relawan' | 'Warga';

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  fcmToken?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
  fcmToken?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}
