import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthResponse, LoginRequest, RegisterRequest, User, VerifyOtpRequest } from '../types';
import { loginApi, registerApi, getCurrentUserApi, verifyOtpApi, renewTokenApi } from '../api/authApi';
import { setAuthTokenInMemory, registerLogoutCallback } from '../api/client';
import {
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
  getSyncStoredToken,
  getSyncStoredUser,
  normalizeUser,
} from '../utils/authStorage';

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getSyncStoredToken());
  const [user, setUser] = useState<User | null>(() => getSyncStoredUser());
  const [loading, setLoading] = useState<boolean>(true);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setAuthTokenInMemory(null);
    clearStoredAuth().catch((err) => {
      console.warn('[AuthContext] Failed to clear stored auth during logout:', err);
    });
  };

  useEffect(() => {
    registerLogoutCallback(handleLogout);
  }, []);

  // Revalidate session on app startup and silently renew token if valid
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const savedToken = await getStoredToken();
        const savedUser = await getStoredUser();

        if (!savedToken) {
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) {
          setToken(savedToken);
          if (savedUser) setUser(savedUser);
        }
        setAuthTokenInMemory(savedToken);

        try {
          // Revalidate current user profile against backend
          const currentUser = await getCurrentUserApi();
          const norm = normalizeUser(currentUser);
          if (isMounted && norm) {
            setUser(norm);
            await setStoredAuth(savedToken, norm);
          }

          // Optional silent token renewal to extend 30-day session window
          try {
            if (typeof renewTokenApi === 'function') {
              const renewed = await renewTokenApi();
              if (renewed?.token && isMounted) {
                const renewedUser = normalizeUser(renewed.user) || norm;
                setToken(renewed.token);
                setAuthTokenInMemory(renewed.token);
                if (renewedUser) {
                  setUser(renewedUser);
                  await setStoredAuth(renewed.token, renewedUser);
                }
              }
            }
          } catch (renewErr) {
            // Renewal is best-effort; current token remains valid
            console.debug('[AuthContext] Silent token renewal skipped/deferred:', renewErr);
          }
        } catch (err: any) {
          const status = err?.response?.status || err?.status;
          const isAuthError =
            status === 401 ||
            (err?.message && /expired|unauthorized|401/i.test(err.message));

          if (isAuthError) {
            console.warn('[AuthContext] Session expired or invalid (401). Clearing stored auth.');
            handleLogout();
          } else {
            // Network error, backend cold start, DNS issue, or timeout:
            // KEEP the existing stored credentials and cached user profile.
            console.warn(
              '[AuthContext] Startup session check encountered network/server error; retaining offline session:',
              err?.message || err
            );
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    setLoading(true);
    try {
      // Clear any stale session state to prevent role contamination
      handleLogout();
      const res: AuthResponse = await loginApi(data);
      if (!res.requiresOtp && res.token) {
        const norm = normalizeUser(res.user);
        setToken(res.token);
        setUser(norm);
        setAuthTokenInMemory(res.token);
        if (norm) {
          await setStoredAuth(res.token, norm);
        }
      }
      return res;
    } catch (error) {
      handleLogout();
      throw error;
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
        setAuthTokenInMemory(res.token);
        if (norm) {
          await setStoredAuth(res.token, norm);
        }
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
      handleLogout();
      const res: AuthResponse = await registerApi(data);
      if (!res.requiresOtp && res.token) {
        const norm = normalizeUser(res.user);
        setToken(res.token);
        setUser(norm);
        setAuthTokenInMemory(res.token);
        if (norm) {
          await setStoredAuth(res.token, norm);
        }
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const refetchUser = async () => {
    const savedToken = token || (await getStoredToken());
    if (!savedToken) return;
    try {
      const currentUser = await getCurrentUserApi();
      const norm = normalizeUser(currentUser);
      if (norm) {
        setUser(norm);
        await setStoredAuth(savedToken, norm);
      }
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      const isAuthError =
        status === 401 ||
        (err?.message && /expired|unauthorized|401/i.test(err.message));
      if (isAuthError) {
        handleLogout();
      }
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
