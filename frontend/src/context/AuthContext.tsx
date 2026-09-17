import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    studentId?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  const raw = localStorage.getItem('nexolab_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('nexolab_token'));
  const [user, setUser] = useState<User | null>(readStoredUser());
  const [ready, setReady] = useState(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem('nexolab_token');
    localStorage.removeItem('nexolab_user');
    setToken(null);
    setUser(null);
  }, []);

  const persist = (nextToken: string, nextUser: User) => {
    localStorage.setItem('nexolab_token', nextToken);
    localStorage.setItem('nexolab_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const storedToken = localStorage.getItem('nexolab_token');
      if (!storedToken) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (cancelled) return;
        localStorage.setItem('nexolab_user', JSON.stringify(data.data));
        setUser(data.data);
        setToken(storedToken);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.data.token, data.data.user);
  }, []);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      fullName: string;
      role?: string;
      studentId?: string;
    }) => {
      const { data } = await api.post('/auth/register', payload);
      persist(data.data.token, data.data.user);
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, token, ready, login, register, logout }),
    [user, token, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
