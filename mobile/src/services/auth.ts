/**
 * 认证服务
 * v1.0.0 Phase 1 - 功能完善
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

const STORAGE_KEY = '@dbmanager:user';

export const authService = {
  /**
   * 登录
   */
  async login(credentials: LoginCredentials): Promise<User> {
    // 模拟登录 (实际应该调用 API)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const user: User = {
      id: 'user_' + Date.now(),
      email: credentials.email,
      name: credentials.email.split('@')[0],
      token: 'token_' + Math.random().toString(36).substr(2),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 天
    };

    await this.saveUser(user);
    return user;
  },

  /**
   * 注册
   */
  async register(data: RegisterData): Promise<User> {
    // 模拟注册
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const user: User = {
      id: 'user_' + Date.now(),
      email: data.email,
      name: data.name,
      token: 'token_' + Math.random().toString(36).substr(2),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    await this.saveUser(user);
    return user;
  },

  /**
   * 登出
   */
  async logout(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return null;

      const user = JSON.parse(data) as User;

      // 检查 token 是否过期
      if (user.expiresAt && Date.now() > user.expiresAt) {
        await this.logout();
        return null;
      }

      return user;
    } catch {
      return null;
    }
  },

  /**
   * 检查是否已登录
   */
  async isLoggedIn(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  },

  /**
   * 保存用户
   */
  private async saveUser(user: User): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<User | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    // 模拟刷新
    const updatedUser: User = {
      ...user,
      token: 'token_' + Math.random().toString(36).substr(2),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    await this.saveUser(updatedUser);
    return updatedUser;
  },
};

/**
 * 认证上下文
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const newUser = await authService.login(credentials);
    setUser(newUser);
    return newUser;
  };

  const register = async (data: RegisterData) => {
    const newUser = await authService.register(data);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isLoggedIn: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
