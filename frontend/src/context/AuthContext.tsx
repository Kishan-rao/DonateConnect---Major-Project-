import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthResponse, LoginRequest, RegisterRequest, User, VerifyOtpRequest } from '../types';
import { loginApi, registerApi, getCurrentUserApi, verifyOtpApi } from '../api/authApi';
import { setAuthTokenInMemory, registerLogoutCallback } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginRequest) => Promise<AuthResponse>;
  verifyOtp: (data: VerifyOtpRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  /** @deprecated Use register() instead */
  registerDonor: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (user: User | null): User | null => {
  if (!user) return null;
  return {
    ...user,
    role: (user.role ? (user.role as string).replace(/^ROLE_/, '') : 'DONOR') as any,
  };
};

const getInitialUser = (): User | null => {
  try {
    const saved = localStorage.getItem('dc-user');
    return saved ? normalizeUser(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dc-token'));
  const [user, setUser] = useState<User | null>(() => getInitialUser());
  const [loading, setLoading] = useState<boolean>(true);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('dc-token');
    localStorage.removeItem('dc-user');
    setAuthTokenInMemory(null);
  };

  useEffect(() => {
    registerLogoutCallback(handleLogout);
  }, []);

  // Revalidate session on app startup
  useEffect(() => {
    const savedToken = localStorage.getItem('dc-token');
    if (savedToken) {
      setAuthTokenInMemory(savedToken);
      getCurrentUserApi()
        .then((currentUser) => {
          const norm = normalizeUser(currentUser);
          setUser(norm);
          localStorage.setItem('dc-user', JSON.stringify(norm));
        })
        .catch(() => {
          // If token expired or invalid, clear session
          handleLogout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    setLoading(true);
    try {
      // Clear any stale session state to prevent role contamination
      // from a previously logged-in account.
      handleLogout();
      const res: AuthResponse = await loginApi(data);
      if (!res.requiresOtp && res.token) {
        const norm = normalizeUser(res.user);
        setToken(res.token);
        setUser(norm);
        localStorage.setItem('dc-token', res.token);
        localStorage.setItem('dc-user', JSON.stringify(norm));
        setAuthTokenInMemory(res.token);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (data: VerifyOtpRequest): Promise<User> => {
    setLoading(true);
    try {
      const res: AuthResponse = await verifyOtpApi(data);
      const norm = normalizeUser(res.user);
      if (res.token) {
        setToken(res.token);
        setUser(norm);
        localStorage.setItem('dc-token', res.token);
        localStorage.setItem('dc-user', JSON.stringify(norm));
        setAuthTokenInMemory(res.token);
      }
      return norm as User;
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (data: RegisterRequest): Promise<AuthResponse> => {
    setLoading(true);
    try {
      // Clear any stale session state to prevent role contamination
      // from a previously logged-in account.
      handleLogout();
      const res: AuthResponse = await registerApi(data);
      if (!res.requiresOtp && res.token) {
        const norm = normalizeUser(res.user);
        setToken(res.token);
        setUser(norm);
        localStorage.setItem('dc-token', res.token);
        localStorage.setItem('dc-user', JSON.stringify(norm));
        setAuthTokenInMemory(res.token);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const refetchUser = async () => {
    const savedToken = token || localStorage.getItem('dc-token');
    if (!savedToken) return;
    try {
      const currentUser = await getCurrentUserApi();
      const norm = normalizeUser(currentUser);
      setUser(norm);
      localStorage.setItem('dc-user', JSON.stringify(norm));
    } catch {
      handleLogout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        verifyOtp,
        register: registerUser,
        registerDonor: registerUser,
        logout: handleLogout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
