import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setAuthToken } from '../lib/api';
import { type OrganizationId } from '../lib/organizations';

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId?: string;
  organizationSlug?: OrganizationId;
  /** null = ADMIN (all clients); string[] = owned client IDs */
  ownedClientIds?: string[] | null;
};

type AuthContextValue = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_KEY = 'cdt_access_token';
const REFRESH_KEY = 'cdt_refresh_token';
const USER_KEY = 'cdt_user';
const ORG_KEY = 'cdt_organization';

function readStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => sessionStorage.getItem(ACCESS_KEY),
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => sessionStorage.getItem(REFRESH_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  useEffect(() => {
    setAuthToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    api
      .get<AuthUser>('/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        setUser(data);
        sessionStorage.setItem(USER_KEY, JSON.stringify(data));
      })
      .catch(() => {
        /* keep stored user if /me fails */
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/login', { email, password });

    sessionStorage.setItem(ACCESS_KEY, data.accessToken);
    sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const rt = sessionStorage.getItem(REFRESH_KEY);
    try {
      if (rt) await api.post('/auth/logout', { refreshToken: rt });
    } catch {
      // ignore logout network errors
    }
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ORG_KEY);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      user,
      login,
      logout,
    }),
    [accessToken, refreshToken, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
