import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../api';
import { UserProfile } from '../types';

interface AuthCtx {
  user:     UserProfile | null;
  token:    string | null;
  loading:  boolean;
  login:    (username: string, password: string) => Promise<void>;
  register: (data: { username:string; password:string; establishment:string; level:string; email?:string }) => Promise<void>;
  logout:   () => void;
  refresh:  () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, token: null, loading: true,
  login: async () => {}, register: async () => {}, logout: () => {}, refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<UserProfile | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me() as UserProfile;
      setUser(me);
    } catch {
      setUser(null);
      localStorage.removeItem('aa_token');
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('aa_token');
    if (stored) {
      setToken(stored);
      refresh().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login({ username, password }) as { token: string; user: UserProfile };
    localStorage.setItem('aa_token', res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (data: Parameters<typeof api.register>[0]) => {
    const res = await api.register(data) as { token: string; user: UserProfile };
    localStorage.setItem('aa_token', res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('aa_token');
    setToken(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, token, loading, login, register, logout, refresh }}>
    {children}
  </Ctx.Provider>;
}

export function useAuth() { return useContext(Ctx); }
