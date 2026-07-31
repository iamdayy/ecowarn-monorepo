import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginPayload, RegisterPayload } from '../types/auth';
import { loginUser, registerUser } from '../services/authService';

const STORAGE_TOKEN_KEY = '@ecowarn_jwt_token';
const STORAGE_USER_KEY = '@ecowarn_user_data';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Membangkitkan sesi pengguna yang tersimpan lokal saat aplikasi dibuka
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
        const storedUserJson = await AsyncStorage.getItem(STORAGE_USER_KEY);

        if (storedToken && storedUserJson) {
          const parsedUser = JSON.parse(storedUserJson) as User;
          setToken(storedToken);
          setUser(parsedUser);
          console.log(`[Auth Context] Sesi dipulihkan untuk pengguna: ${parsedUser.name} (${parsedUser.role})`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Error Auth Context - restoreSession] Gagal memuat data dari AsyncStorage: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (payload: LoginPayload): Promise<void> => {
    try {
      setIsLoading(true);
      const authResponse = await loginUser(payload);
      
      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, authResponse.token);
      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(authResponse.user));

      setToken(authResponse.token);
      setUser(authResponse.user);
      console.log(`[Auth Context] Login berhasil: ${authResponse.user.name} (${authResponse.user.role})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Auth Context - login] Proses login gagal: ${errorMessage}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    try {
      setIsLoading(true);
      const authResponse = await registerUser(payload);

      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, authResponse.token);
      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(authResponse.user));

      setToken(authResponse.token);
      setUser(authResponse.user);
      console.log(`[Auth Context] Registrasi berhasil: ${authResponse.user.name} (${authResponse.user.role})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Auth Context - register] Proses registrasi gagal: ${errorMessage}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
      await AsyncStorage.removeItem(STORAGE_USER_KEY);
      setToken(null);
      setUser(null);
      console.log('[Auth Context] Sesi diakhiri, berhasil logout.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Error Auth Context - logout] Gagal menghapus sesi dari memori lokal: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth wajib digunakan di dalam komponen AuthProvider');
  }
  return context;
};
